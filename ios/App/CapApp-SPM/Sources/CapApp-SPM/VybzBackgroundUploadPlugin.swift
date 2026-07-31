import Foundation
import Capacitor

/**
 * Background-safe upload scheduling via URLSession (Phase 19).
 * Complements the shared TS upload queue — native side keeps transfers alive
 * when the app is suspended.
 */
@objc(VybzBackgroundUploadPlugin)
public class VybzBackgroundUploadPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VybzBackgroundUploadPlugin"
    public let jsName = "VybzBackgroundUpload"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enqueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
    ]

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: "cloud.vybz.app.upload.v1")
        config.isDiscretionary = false
        config.sessionSendsLaunchEvents = true
        return URLSession(configuration: config, delegate: nil, delegateQueue: nil)
    }()

    private var tasks: [String: URLSessionUploadTask] = [:]

    @objc func enqueue(_ call: CAPPluginCall) {
        guard let id = call.getString("id"), !id.isEmpty,
              let urlStr = call.getString("url"),
              let url = URL(string: urlStr),
              let filePath = call.getString("filePath") else {
            call.reject("id, url, and filePath required")
            return
        }
        let fileURL = URL(fileURLWithPath: filePath)
        var request = URLRequest(url: url)
        request.httpMethod = call.getString("method") ?? "PUT"
        if let contentType = call.getString("contentType") {
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }
        let task = session.uploadTask(with: request, fromFile: fileURL)
        tasks[id] = task
        task.resume()
        call.resolve(["id": id, "state": "running"])
    }

    @objc func cancel(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id required")
            return
        }
        tasks[id]?.cancel()
        tasks.removeValue(forKey: id)
        call.resolve(["id": id, "state": "canceled"])
    }

    @objc func status(_ call: CAPPluginCall) {
        guard let id = call.getString("id") else {
            call.reject("id required")
            return
        }
        let state: String
        if let task = tasks[id] {
            switch task.state {
            case .running: state = "running"
            case .suspended: state = "suspended"
            case .canceling: state = "canceling"
            case .completed: state = "completed"
            @unknown default: state = "unknown"
            }
        } else {
            state = "idle"
        }
        call.resolve(["id": id, "state": state])
    }
}
