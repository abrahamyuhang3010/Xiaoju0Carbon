ObjC.import("Foundation");
ObjC.import("ImageIO");
ObjC.import("Vision");

function unwrap(value) {
  if (value === undefined || value === null) {
    return "";
  }
  try {
    return ObjC.unwrap(value);
  } catch (error) {
    return String(value);
  }
}

function nsArrayToJs(array) {
  const out = [];
  if (!array) {
    return out;
  }
  const count = Number(array.count);
  for (let i = 0; i < count; i += 1) {
    out.push(array.objectAtIndex(i));
  }
  return out;
}

function recognizeImage(path) {
  const url = $.NSURL.fileURLWithPath(path);
  const source = $.CGImageSourceCreateWithURL(url, null);
  if (!source) {
    throw new Error("cannot open image: " + path);
  }
  const image = $.CGImageSourceCreateImageAtIndex(source, 0, null);
  if (!image) {
    throw new Error("cannot decode image: " + path);
  }

  const request = $.VNRecognizeTextRequest.alloc.init;
  request.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
  request.usesLanguageCorrection = false;
  request.recognitionLanguages = $(["en-US", "zh-Hans"]);
  request.minimumTextHeight = 0.0;

  const handler = $.VNImageRequestHandler.alloc.initWithCGImageOptions(image, $({}));
  const ok = handler.performRequestsError($([request]), null);
  const observations = [];
  if (!ok) {
    return observations;
  }

  for (const obs of nsArrayToJs(request.results)) {
    const candidates = obs.topCandidates(1);
    if (!candidates || Number(candidates.count) === 0) {
      continue;
    }
    const candidate = candidates.objectAtIndex(0);
    const text = unwrap(candidate.string).trim();
    if (!text) {
      continue;
    }
    const rect = obs.boundingBox;
    observations.push({
      text: text,
      confidence: Number(candidate.confidence),
      x: Number(rect.origin.x),
      y: Number(rect.origin.y),
      w: Number(rect.size.width),
      h: Number(rect.size.height),
    });
  }

  observations.sort(function (a, b) {
    const ay = 1 - a.y - a.h;
    const by = 1 - b.y - b.h;
    if (Math.abs(ay - by) > 0.012) {
      return ay - by;
    }
    return a.x - b.x;
  });
  return observations;
}

function run(argv) {
  if (argv.length < 1) {
    throw new Error("usage: osascript -l JavaScript ocr_formula_image_jxa.js -- image.png [image2.png ...]");
  }
  const results = argv.map(function (path) {
    return { image_path: path, observations: recognizeImage(path) };
  });
  console.log(JSON.stringify(results));
}
