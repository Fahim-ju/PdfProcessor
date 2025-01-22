const fs = require("fs");
const path = require("path");
const { labelDataGenerator } = require("./promptGenerator");

const { processPdfWithChatGPT } = require("./processor");

(async () => {
  try {
    const inputFolder = path.join(__dirname, process.env.INPUT_FOLDER);
    const outputFolder = path.join(__dirname, process.env.OUTPUT_FOLDER);
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }
    //labelDataGenerator();
    const inputFiles = fs.readdirSync(inputFolder);
    for (const pdfFile of inputFiles) {
      try {
        const pdfBuffer = fs.readFileSync(path.join(inputFolder, pdfFile));
        const outputFileName = path.basename(pdfFile, path.extname(pdfFile)) + "_output.json";

        const result = await processPdfWithChatGPT(
          pdfBuffer,
          outputFolder + "/" + path.basename(pdfFile, path.extname(pdfFile)) + "_plainText.txt"
        );
        const outputFile = path.join(outputFolder, outputFileName);
        try {
          fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        } catch (error) {
          console.log(`Failed to write json file for ${pdfFile}`);
        }
        console.log(`Output for ${pdfFile} saved to ${outputFile}`);
      } catch (error) {
        console.error(`Error processing ${pdfFile}:`, error);
      }
    }
  } catch (error) {
    console.error("Error executing the function:", error);
  }
})();
