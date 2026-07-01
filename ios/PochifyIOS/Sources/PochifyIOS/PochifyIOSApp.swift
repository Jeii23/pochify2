#if canImport(SwiftUI)
import SwiftUI

@main
struct PochifyIOSApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
#else
@main
struct PochifyIOSApp {
    static func main() {
        print("PochifyIOS is a SwiftUI iOS app. Build it with Xcode on macOS to run the UI.")
    }
}
#endif
