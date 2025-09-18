const fs = require("fs");
const path = require("path");
const PizZip = require("pizzip");
const Docxtemplater = require("docxtemplater");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const TEMPLATE_PATH = path.join(
  __dirname,
  "..",
  "templates",
  "negotiation_template.docx"
);

function renderDocx(data) {
  const content = fs.readFileSync(TEMPLATE_PATH);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
  doc.setData(data);
  doc.render(); // throws if a tag is missing
  return doc.getZip().generate({ type: "nodebuffer" });
}

async function docxToPdfBuffer(docxBuffer) {
  // write to tmp .docx
  const tmpRoot = await fs.promises.mkdtemp(path.join(os.tmpdir(), "oon-"));
  const inPath = path.join(tmpRoot, "doc.docx");
  const outDir = tmpRoot; // soffice writes PDF here
  await fs.promises.writeFile(inPath, docxBuffer);

  const soffice = process.env.LIBREOFFICE_PATH || "soffice";
  await execFileAsync(soffice, [
    "--headless",
    "--nologo",
    "--convert-to",
    "pdf",
    "--outdir",
    outDir,
    inPath,
  ]);

  const pdfPath = path.join(outDir, "doc.pdf");
  const pdf = await fs.promises.readFile(pdfPath);

  // Cleanup best-effort
  fs.promises.rm(tmpRoot, { recursive: true, force: true }).catch(() => {});
  return pdf;
}

module.exports = { renderDocx, docxToPdfBuffer };
