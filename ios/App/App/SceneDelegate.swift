import UIKit
import Capacitor

/*
 * The web view starts below the status bar, on a cardinal backing, so the
 * clock and battery sit on the same red as the toolkit's banner and page
 * content never scrolls underneath them. Doing it here keeps the web build
 * identical to the one on the website.
 */
class ToolkitViewController: CAPBridgeViewController {
    private static let cardinal = UIColor(red: 0x8C / 255, green: 0x15 / 255, blue: 0x15 / 255, alpha: 1)

    override func viewDidLoad() {
        super.viewDidLoad()
        guard let web = webView else { return }

        let container = UIView(frame: web.frame)
        container.backgroundColor = Self.cardinal
        view = container

        web.translatesAutoresizingMaskIntoConstraints = false
        container.addSubview(web)
        NSLayoutConstraint.activate([
            web.topAnchor.constraint(equalTo: container.safeAreaLayoutGuide.topAnchor),
            web.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            web.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            web.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = ToolkitViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}
