#!/usr/bin/env python3
import tempfile
import unittest
from pathlib import Path

from server import (
    DEFAULT_SAVE_FILE_NAME,
    SaveValidationError,
    update_ranking_with_game,
    read_latest_save,
    read_ranking,
    validate_save_payload,
    write_latest_save,
)


def payload(name):
    return {
        "version": 1,
        "savedAt": "2026-07-01T13:00:00Z",
        "state": {
            "phase": "bidding",
            "selectedPlayerCount": 3,
            "playerNames": [name, "Player 2", "Player 3"],
            "engine": {
                "players": [{"id": "p1", "name": name}],
                "totalCards": 36,
                "totalRounds": 28,
                "currentRound": 1,
                "startingPlayerIndex": 0,
                "activeRound": {"roundNumber": 1},
                "lastRoundResults": [],
            },
            "activeRound": {"roundNumber": 1},
            "biddingIndex": 0,
            "bidDraft": 1,
            "tricksDrafts": {},
        },
    }


def game_result(game_id, winner_name, scores=None, round_deltas=None):
    player_names = ["M", "N", "J"]
    scores = scores or {
        "M": 10,
        "N": 45 if winner_name == "N" else 20,
        "J": 50 if winner_name == "J" else 15,
    }
    round_deltas = round_deltas or {
        "M": [-5, 10],
        "N": [20, -10],
        "J": [15, -15],
    }
    players = [
        {"id": name.lower(), "name": name, "totalScore": scores[name]}
        for name in player_names
    ]

    rounds = []
    for round_index in range(2):
        rounds.append(
            {
                "roundNumber": round_index + 1,
                "roundType": "BASIC",
                "cardsPerPlayer": 1,
                "results": [
                    {
                        "playerID": name.lower(),
                        "playerName": name,
                        "scoreDelta": round_deltas[name][round_index],
                    }
                    for name in player_names
                ],
            }
        )

    return {
        "version": 1,
        "gameID": game_id,
        "finishedAt": "2026-07-01T14:00:00Z",
        "players": players,
        "rounds": rounds,
    }


class ServerSaveTests(unittest.TestCase):
    def test_latest_save_overwrites_previous_payload(self):
        with tempfile.TemporaryDirectory() as directory:
            save_dir = Path(directory)

            write_latest_save(payload("First"), save_dir)
            write_latest_save(payload("Second"), save_dir)

            saved_files = list(save_dir.glob("*.json"))
            self.assertEqual([DEFAULT_SAVE_FILE_NAME], [file.name for file in saved_files])
            self.assertEqual("Second", read_latest_save(save_dir)["state"]["playerNames"][0])

    def test_missing_save_returns_none(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertIsNone(read_latest_save(Path(directory)))

    def test_rejects_payload_without_engine_snapshot(self):
        bad_payload = payload("Bad")
        bad_payload["state"].pop("engine")

        with self.assertRaises(SaveValidationError):
            validate_save_payload(bad_payload)


class ServerRankingTests(unittest.TestCase):
    def test_ranking_accumulates_wins_for_players(self):
        with tempfile.TemporaryDirectory() as directory:
            save_dir = Path(directory)

            update_ranking_with_game(game_result("game-1", "N"), save_dir)
            update_ranking_with_game(game_result("game-2", "N"), save_dir)
            public_ranking, recorded = update_ranking_with_game(game_result("game-3", "J"), save_dir)

            self.assertTrue(recorded)
            self.assertEqual(3, public_ranking["gamesRecorded"])

            players_by_name = {
                player["name"]: player
                for player in public_ranking["players"]
            }

            self.assertEqual(2, players_by_name["N"]["wins"])
            self.assertEqual(1, players_by_name["J"]["wins"])
            self.assertEqual(0, players_by_name["M"]["wins"])
            self.assertEqual("N", public_ranking["players"][0]["name"])

    def test_ranking_tracks_round_and_game_extremes(self):
        with tempfile.TemporaryDirectory() as directory:
            save_dir = Path(directory)
            result = game_result(
                "stats-game",
                "J",
                scores={"M": -10, "N": 30, "J": 80},
                round_deltas={
                    "M": [-25, 10],
                    "N": [35, -5],
                    "J": [20, 40],
                },
            )

            public_ranking, _ = update_ranking_with_game(result, save_dir)
            players_by_name = {
                player["name"]: player
                for player in public_ranking["players"]
            }

            self.assertEqual(80, players_by_name["J"]["bestGameScore"])
            self.assertEqual(40, players_by_name["J"]["bestRoundGain"])
            self.assertEqual(-25, players_by_name["M"]["worstRoundLoss"])
            self.assertEqual(2, players_by_name["N"]["roundsPlayed"])

    def test_game_result_id_is_not_counted_twice(self):
        with tempfile.TemporaryDirectory() as directory:
            save_dir = Path(directory)

            update_ranking_with_game(game_result("repeat-game", "N"), save_dir)
            public_ranking, recorded = update_ranking_with_game(game_result("repeat-game", "N"), save_dir)

            self.assertFalse(recorded)
            self.assertEqual(1, public_ranking["gamesRecorded"])
            self.assertEqual(1, read_ranking(save_dir)["players"]["n"]["wins"])


if __name__ == "__main__":
    unittest.main()
