ObjC.import("AppKit");
ObjC.import("CoreGraphics");
ObjC.import("Foundation");
ObjC.import("PDFKit");
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

function makeBitmapContext(width, height) {
  const colorSpace = $.CGColorSpaceCreateDeviceRGB();
  const bitmapInfo = $.kCGImageAlphaPremultipliedLast;
  const ctx = $.CGBitmapContextCreate(null, width, height, 8, 0, colorSpace, bitmapInfo);
  $.CGContextSetRGBFillColor(ctx, 1, 1, 1, 1);
  $.CGContextFillRect(ctx, $.CGRectMake(0, 0, width, height));
  return ctx;
}

function renderPageToCGImage(page, scale) {
  const box = 0; // PDFDisplayBox.mediaBox
  const bounds = page.boundsForBox(box);
  const width = Math.max(1, Math.ceil(Number(bounds.size.width) * scale));
  const height = Math.max(1, Math.ceil(Number(bounds.size.height) * scale));
  const ctx = makeBitmapContext(width, height);

  $.CGContextSaveGState(ctx);
  $.CGContextScaleCTM(ctx, scale, scale);
  page.drawWithBoxToContext(box, ctx);
  $.CGContextRestoreGState(ctx);

  return {
    image: $.CGBitmapContextCreateImage(ctx),
    width: width,
    height: height,
    pageWidth: Number(bounds.size.width),
    pageHeight: Number(bounds.size.height),
  };
}

function saveCGImage(cgImage, path) {
  const rep = $.NSBitmapImageRep.alloc.initWithCGImage(cgImage);
  const data = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $({}));
  data.writeToFileAtomically(path, true);
}

function recognizePage(page, pageNumber, scale, languages) {
  const rendered = renderPageToCGImage(page, scale);
  const request = $.VNRecognizeTextRequest.alloc.init;
  request.recognitionLevel = $.VNRequestTextRecognitionLevelAccurate;
  request.recognitionLanguages = $(languages);
  request.usesLanguageCorrection = true;
  request.minimumTextHeight = 0.003;

  const handler = $.VNImageRequestHandler.alloc.initWithCGImageOptions(rendered.image, $({}));
  const ok = handler.performRequestsError($([request]), null);
  const observations = [];
  if (ok) {
    const results = nsArrayToJs(request.results);
    for (let i = 0; i < results.length; i += 1) {
      const obs = results[i];
      const candidates = obs.topCandidates(1);
      if (!candidates || Number(candidates.count) === 0) {
        continue;
      }
      const candidate = candidates.objectAtIndex(0);
      const text = unwrap(candidate.string).replace(/\s+$/g, "");
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
  }

  observations.sort(function (a, b) {
    const ay = 1 - a.y - a.h;
    const by = 1 - b.y - b.h;
    if (Math.abs(ay - by) > 0.01) {
      return ay - by;
    }
    return a.x - b.x;
  });

  return {
    page: pageNumber,
    page_width: rendered.pageWidth,
    page_height: rendered.pageHeight,
    render_width: rendered.width,
    render_height: rendered.height,
    observations: observations,
  };
}

function parseIntArg(value, fallback) {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function run(argv) {
  if (argv.length < 1) {
    throw new Error("usage: osascript -l JavaScript ocr_pdf_pages_jxa.js -- PDF [start_page] [end_page] [scale]");
  }
  const pdfPath = argv[0];
  const startPage = Math.max(1, parseIntArg(argv[1], 1));
  const scale = Math.max(1.5, Number(argv[3] || "2.4"));
  const debugImagePath = argv[4] || "";
  const languages = ["zh-Hans", "en-US"];
  const doc = $.PDFDocument.alloc.initWithURL($.NSURL.fileURLWithPath(pdfPath));
  if (!doc) {
    throw new Error("cannot open PDF: " + pdfPath);
  }
  const pageCount = Number(doc.pageCount);
  const endPage = Math.min(pageCount, parseIntArg(argv[2], pageCount));
  for (let pageNo = startPage; pageNo <= endPage; pageNo += 1) {
    const page = doc.pageAtIndex(pageNo - 1);
    const result = recognizePage(page, pageNo, scale, languages);
    if (debugImagePath && pageNo === startPage) {
      const rendered = renderPageToCGImage(page, scale);
      saveCGImage(rendered.image, debugImagePath);
    }
    console.log(JSON.stringify(result));
  }
}
