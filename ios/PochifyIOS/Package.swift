// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "PochifyIOS",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .library(
            name: "PochifyCore",
            targets: ["PochifyCore"]
        ),
        .executable(
            name: "PochifyIOS",
            targets: ["PochifyIOS"]
        )
    ],
    targets: [
        .target(
            name: "PochifyCore"
        ),
        .executableTarget(
            name: "PochifyIOS",
            dependencies: ["PochifyCore"]
        ),
        .testTarget(
            name: "PochifyCoreTests",
            dependencies: ["PochifyCore"]
        )
    ]
)
