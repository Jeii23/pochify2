#!/usr/bin/env python3
"""Legacy Pochify web server with deprecated server-side save/stat APIs.

The active web app is fully static and stores saves/statistics in browser
localStorage. This file is kept only as an old local static-file helper/API.
"""

from __future__ import annotations

import argparse
import json
import os
import tempfile
import threading
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


WEB_ROOT = Path(__file__).resolve().parent
DEFAULT_SAVE_DIR = WEB_ROOT / "server_data"
DEFAULT_SAVE_FILE_NAME = "latest-game.json"
DEFAULT_RANKING_FILE_NAME = "ranking.json"
MAX_SAVE_BYTES = 512 * 1024
MAX_GAME_RESULT_BYTES = 512 * 1024
RANKING_LOCK = threading.Lock()


class SaveValidationError(ValueError):
    pass


class GameResultValidationError(ValueError):
    pass


def save_file_for(save_dir: Path) -> Path:
    return save_dir / DEFAULT_SAVE_FILE_NAME


def ranking_file_for(save_dir: Path) -> Path:
    return save_dir / DEFAULT_RANKING_FILE_NAME


def validate_save_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise SaveValidationError("Save payload must be a JSON object.")

    if payload.get("version") != 1:
        raise SaveValidationError("Save payload version must be 1.")

    state = payload.get("state")
    if not isinstance(state, dict):
        raise SaveValidationError("Save payload must include a state object.")

    if not isinstance(state.get("engine"), dict):
        raise SaveValidationError("Save state must include a game engine snapshot.")

    if not isinstance(state.get("phase"), str):
        raise SaveValidationError("Save state must include the current phase.")

    return payload


def normalize_player_name(name: str) -> str:
    normalized = " ".join(name.strip().split())
    return normalized or "Player"


def player_key(name: str) -> str:
    return normalize_player_name(name).casefold()


def empty_ranking() -> dict[str, Any]:
    return {
        "version": 1,
        "updatedAt": None,
        "gamesRecorded": 0,
        "processedGameIDs": [],
        "players": {},
    }


def empty_player_stats(name: str) -> dict[str, Any]:
    return {
        "name": normalize_player_name(name),
        "gamesPlayed": 0,
        "wins": 0,
        "roundsPlayed": 0,
        "totalFinalScore": 0,
        "bestGameScore": None,
        "worstGameScore": None,
        "bestRoundGain": None,
        "worstRoundLoss": None,
        "bestWinningMargin": None,
        "lastGameScore": None,
        "lastPlayedAt": None,
    }


def validate_game_result_payload(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, dict):
        raise GameResultValidationError("Game result payload must be a JSON object.")

    if payload.get("version") != 1:
        raise GameResultValidationError("Game result payload version must be 1.")

    game_id = payload.get("gameID")
    if not isinstance(game_id, str) or not game_id.strip():
        raise GameResultValidationError("Game result must include a gameID.")

    players = payload.get("players")
    if not isinstance(players, list) or not players:
        raise GameResultValidationError("Game result must include players.")

    for player in players:
        if not isinstance(player, dict):
            raise GameResultValidationError("Each player result must be an object.")
        if not isinstance(player.get("name"), str) or not player["name"].strip():
            raise GameResultValidationError("Each player result must include a name.")
        if not isinstance(player.get("totalScore"), int):
            raise GameResultValidationError("Each player result must include a final score.")

    rounds = payload.get("rounds", [])
    if not isinstance(rounds, list):
        raise GameResultValidationError("Game result rounds must be a list.")

    for round_summary in rounds:
        if not isinstance(round_summary, dict):
            raise GameResultValidationError("Each round summary must be an object.")
        results = round_summary.get("results", [])
        if not isinstance(results, list):
            raise GameResultValidationError("Each round summary must include result rows.")
        for result in results:
            if not isinstance(result, dict):
                raise GameResultValidationError("Each round result must be an object.")
            if not isinstance(result.get("scoreDelta"), int):
                raise GameResultValidationError("Each round result must include scoreDelta.")

    return payload


def write_latest_save(payload: Any, save_dir: Path) -> Path:
    payload = validate_save_payload(payload)
    save_dir.mkdir(parents=True, exist_ok=True)
    save_file = save_file_for(save_dir)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=save_dir,
        delete=False,
        prefix=".latest-game-",
        suffix=".tmp",
    ) as temp_file:
        json.dump(payload, temp_file, indent=2, sort_keys=True)
        temp_file.write("\n")
        temp_name = temp_file.name

    os.replace(temp_name, save_file)
    return save_file


def read_latest_save(save_dir: Path) -> dict[str, Any] | None:
    save_file = save_file_for(save_dir)
    if not save_file.exists():
        return None

    with save_file.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    return validate_save_payload(payload)


def read_ranking(save_dir: Path) -> dict[str, Any]:
    ranking_file = ranking_file_for(save_dir)
    if not ranking_file.exists():
        return empty_ranking()

    with ranking_file.open("r", encoding="utf-8") as file:
        payload = json.load(file)

    if not isinstance(payload, dict) or payload.get("version") != 1:
        return empty_ranking()

    payload.setdefault("updatedAt", None)
    payload.setdefault("gamesRecorded", 0)
    payload.setdefault("processedGameIDs", [])
    payload.setdefault("players", {})
    return payload


def write_ranking(ranking: dict[str, Any], save_dir: Path) -> Path:
    save_dir.mkdir(parents=True, exist_ok=True)
    ranking_file = ranking_file_for(save_dir)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=save_dir,
        delete=False,
        prefix=".ranking-",
        suffix=".tmp",
    ) as temp_file:
        json.dump(ranking, temp_file, indent=2, sort_keys=True)
        temp_file.write("\n")
        temp_name = temp_file.name

    os.replace(temp_name, ranking_file)
    return ranking_file


def public_ranking(ranking: dict[str, Any]) -> dict[str, Any]:
    players = []
    for stats in ranking.get("players", {}).values():
        games_played = stats.get("gamesPlayed", 0)
        wins = stats.get("wins", 0)
        total_score = stats.get("totalFinalScore", 0)
        public_stats = dict(stats)
        public_stats["averageFinalScore"] = round(total_score / games_played, 2) if games_played else 0
        public_stats["winRate"] = round(wins / games_played, 3) if games_played else 0
        players.append(public_stats)

    def numeric_stat(stats: dict[str, Any], name: str, fallback: int = 0) -> int:
        value = stats.get(name)
        return value if isinstance(value, int) else fallback

    players.sort(
        key=lambda stats: (
            -numeric_stat(stats, "wins"),
            -numeric_stat(stats, "bestGameScore", -10**9),
            -numeric_stat(stats, "totalFinalScore"),
            stats.get("name", ""),
        )
    )

    return {
        "version": 1,
        "updatedAt": ranking.get("updatedAt"),
        "gamesRecorded": ranking.get("gamesRecorded", 0),
        "players": players,
    }


def update_optional_max(current: int | None, candidate: int) -> int:
    return candidate if current is None else max(current, candidate)


def update_optional_min(current: int | None, candidate: int) -> int:
    return candidate if current is None else min(current, candidate)


def update_ranking_with_game(payload: Any, save_dir: Path) -> tuple[dict[str, Any], bool]:
    payload = validate_game_result_payload(payload)
    with RANKING_LOCK:
        ranking = read_ranking(save_dir)
        processed_ids = ranking.setdefault("processedGameIDs", [])
        game_id = payload["gameID"].strip()

        if game_id in processed_ids:
            return public_ranking(ranking), False

        players = payload["players"]
        finished_at = payload.get("finishedAt")
        max_score = max(player["totalScore"] for player in players)
        sorted_scores = sorted((player["totalScore"] for player in players), reverse=True)
        second_score = sorted_scores[1] if len(sorted_scores) > 1 else max_score
        winners = {
            player_key(player["name"])
            for player in players
            if player["totalScore"] == max_score
        }
        player_names_by_id = {
            player.get("id"): normalize_player_name(player["name"])
            for player in players
            if isinstance(player.get("id"), str)
        }
        players_by_key = ranking.setdefault("players", {})

        for player in players:
            key = player_key(player["name"])
            stats = players_by_key.setdefault(key, empty_player_stats(player["name"]))
            stats["name"] = normalize_player_name(player["name"])
            stats["gamesPlayed"] += 1
            stats["wins"] += 1 if key in winners else 0
            stats["totalFinalScore"] += player["totalScore"]
            stats["bestGameScore"] = update_optional_max(stats["bestGameScore"], player["totalScore"])
            stats["worstGameScore"] = update_optional_min(stats["worstGameScore"], player["totalScore"])
            stats["lastGameScore"] = player["totalScore"]
            stats["lastPlayedAt"] = finished_at

            if key in winners:
                margin = max_score - second_score
                stats["bestWinningMargin"] = update_optional_max(stats["bestWinningMargin"], margin)

        for round_summary in payload.get("rounds", []):
            for result in round_summary.get("results", []):
                result_name = player_names_by_id.get(result.get("playerID")) or result.get("playerName")
                if not isinstance(result_name, str):
                    continue

                key = player_key(result_name)
                stats = players_by_key.setdefault(key, empty_player_stats(result_name))
                delta = result["scoreDelta"]
                stats["roundsPlayed"] += 1
                stats["bestRoundGain"] = update_optional_max(stats["bestRoundGain"], delta)
                stats["worstRoundLoss"] = update_optional_min(stats["worstRoundLoss"], delta)

        processed_ids.append(game_id)
        del processed_ids[:-500]
        ranking["gamesRecorded"] = ranking.get("gamesRecorded", 0) + 1
        ranking["updatedAt"] = finished_at
        write_ranking(ranking, save_dir)

        return public_ranking(ranking), True


class PochifyHandler(SimpleHTTPRequestHandler):
    save_dir = DEFAULT_SAVE_DIR

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, directory=str(WEB_ROOT), **kwargs)

    def do_GET(self) -> None:
        if self.api_path == "/api/save":
            self.handle_get_save()
            return

        if self.api_path == "/api/ranking":
            self.handle_get_ranking()
            return

        super().do_GET()

    def do_POST(self) -> None:
        if self.api_path == "/api/save":
            self.handle_post_save()
            return

        if self.api_path == "/api/ranking/game":
            self.handle_post_game_result()
            return

        self.respond_json(
            HTTPStatus.NOT_FOUND,
            {"ok": False, "message": "Unknown API endpoint."},
        )

    @property
    def api_path(self) -> str:
        return urlparse(self.path).path

    def handle_get_save(self) -> None:
        try:
            payload = read_latest_save(self.save_dir)
        except (OSError, json.JSONDecodeError, SaveValidationError):
            self.respond_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "message": "Saved game is unreadable."},
            )
            return

        if payload is None:
            self.respond_json(
                HTTPStatus.NOT_FOUND,
                {"ok": False, "message": "No saved game."},
            )
            return

        self.respond_json(HTTPStatus.OK, payload)

    def handle_get_ranking(self) -> None:
        try:
            payload = public_ranking(read_ranking(self.save_dir))
        except (OSError, json.JSONDecodeError):
            self.respond_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "message": "Ranking is unreadable."},
            )
            return

        self.respond_json(HTTPStatus.OK, payload)

    def handle_post_save(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": "Invalid content length."},
            )
            return

        if length <= 0 or length > MAX_SAVE_BYTES:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": "Save payload size is invalid."},
            )
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            write_latest_save(payload, self.save_dir)
        except (UnicodeDecodeError, json.JSONDecodeError, SaveValidationError) as error:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": str(error)},
            )
            return
        except OSError:
            self.respond_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "message": "Could not write saved game."},
            )
            return

        self.respond_json(
            HTTPStatus.OK,
            {"ok": True, "message": "Saved latest game."},
        )

    def handle_post_game_result(self) -> None:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": "Invalid content length."},
            )
            return

        if length <= 0 or length > MAX_GAME_RESULT_BYTES:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": "Game result payload size is invalid."},
            )
            return

        try:
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            ranking, recorded = update_ranking_with_game(payload, self.save_dir)
        except (UnicodeDecodeError, json.JSONDecodeError, GameResultValidationError) as error:
            self.respond_json(
                HTTPStatus.BAD_REQUEST,
                {"ok": False, "message": str(error)},
            )
            return
        except OSError:
            self.respond_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"ok": False, "message": "Could not update ranking."},
            )
            return

        self.respond_json(
            HTTPStatus.OK,
            {"ok": True, "recorded": recorded, "ranking": ranking},
        )

    def respond_json(self, status: HTTPStatus, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the Pochify web server.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--save-dir", type=Path, default=DEFAULT_SAVE_DIR)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    PochifyHandler.save_dir = args.save_dir
    server = ThreadingHTTPServer((args.host, args.port), PochifyHandler)
    print(f"Serving Pochify on http://{args.host}:{args.port}/")
    print(f"Latest save file: {save_file_for(args.save_dir)}")
    server.serve_forever()


if __name__ == "__main__":
    main()
