import Foundation
import ImageIO
import Vision

guard CommandLine.arguments.count >= 2 else {
    fputs("usage: ocr_formula_image.swift image.png\n", stderr)
    exit(2)
}

let url = URL(fileURLWithPath: CommandLine.arguments[1])
guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("failed to load image\n", stderr)
    exit(1)
}

let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
request.recognitionLanguages = ["en-US"]
request.minimumTextHeight = 0.0

let handler = VNImageRequestHandler(cgImage: image, options: [:])
do {
    try handler.perform([request])
} catch {
    fputs("OCR failed: \(error)\n", stderr)
    exit(1)
}

let observations = (request.results ?? []).sorted {
    let ay = $0.boundingBox.midY
    let by = $1.boundingBox.midY
    if abs(ay - by) > 0.012 {
        return ay > by
    }
    return $0.boundingBox.minX < $1.boundingBox.minX
}

for obs in observations {
    if let text = obs.topCandidates(1).first?.string.trimmingCharacters(in: .whitespacesAndNewlines),
       !text.isEmpty {
        print(text)
    }
}
