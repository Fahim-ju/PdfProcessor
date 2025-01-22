const fs = require("fs");
const path = require("path");
require("dotenv").config();

const generateSingleLine = (userText, outputText) => {
  const prompt = `{"messages": [{"role": "system", "content": "You are an AI assistant that extracts structured data from purchase order invoice."}, {"role": "user", "content": "${userText}"}, {"role": "assistant", "content": "${outputText}"}]}`;
  return prompt;
};
const labelDataGenerator = () => {
  function escapeString(input) {
    return input.replace(/[\\"'\n\t]/g, (match) => {
      switch (match) {
        case "\\":
          return "\\\\";
        case '"':
          return '\\"';
        case "'":
          return "\\'";
        case "\n":
          return " ";
        case "\t":
          return " ";
        case "\r":
          return " ";
        case "\b":
          return " ";
        default:
          return match;
      }
    });
  }
  try {
    //const inputJsonFolder = path.join(__dirname, "/Labeled data/input json");
    //const outputFolderJsonFolder = path.join(__dirname, "/Labeled data/outputJson");
    ///initial file run
    const baseLabelFolder = path.join(__dirname, "/Labeled data");
    const labeledFileName = path.join(baseLabelFolder, "labeledTestData.jsonl");
    const expectedOutputFolder = path.join(baseLabelFolder, "manualMappedData");
    fs.writeFileSync(labeledFileName, "");
    const expectedOutputJsonFiles = fs.readdirSync(expectedOutputFolder);
    const inputTextFolder = path.join(__dirname, process.env.INPUT_FOLDER);
    const inputTextFiles = fs.readdirSync(inputTextFolder).filter((file) => file.endsWith(".txt"));
    for (const file of expectedOutputJsonFiles) {
      try {
        const matchedInputTextFileName = inputTextFiles.find((inputTextFile) =>
          path.basename(inputTextFile, path.extname(inputTextFile)).includes(path.basename(file, path.extname(file)))
        );
        if (matchedInputTextFileName) {
          const outputFileBuffer = fs.readFileSync(path.join(expectedOutputFolder, file));
          const outputText = outputFileBuffer.toString("utf-8");
          const expectedOutputText = JSON.stringify(JSON.parse(outputText));
          const inputFileBuffer = fs.readFileSync(path.join(inputTextFolder, matchedInputTextFileName));
          const inputFileText = inputFileBuffer.toString("utf-8");
          const singleLinePrompt = generateSingleLine(escapeString(inputFileText), escapeString(expectedOutputText).split(",").join(", "));
          fs.appendFileSync(labeledFileName, `${singleLinePrompt}\n`, "utf8");
        }
        //const outputFileName = path.basename(file, path.extname(file)) + ".text";
      } catch (error) {
        console.error(`Error reading ${file} while generating system text`, error);
      }
    }
  } catch (error) {
    console.log(`Failed to escape string`);
  }
};
const writeFileSync = () => {};

module.exports = { labelDataGenerator };
