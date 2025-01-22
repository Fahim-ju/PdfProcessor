require("dotenv").config();
const pdfParse = require("pdf-parse");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const processPdfWithChatGPT = async (pdfBuffer, outputFileName) => {
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
    const inputJsonFolder = path.join(__dirname, "/Labeled data/input json");
    const outputFolderJsonFolder = path.join(__dirname, "/Labeled data/outputJson");
    const inputJsonFiles = fs.readdirSync(inputFolder);
    for (const file of inputJsonFiles) {
      try {
        const fileBuffer = fs.readFileSync(path.join(inputJsonFolder, file));
        const outputFileName = path.basename(file, path.extname(file)) + ".text";

        const result = await processPdfWithChatGPT(
          fileBuffer,
          outputFolderJsonFolder + "/" + path.basename(file, path.extname(file)) + "_plainText.txt"
        );
        const outputFile = path.join(outputFolderJsonFolder, outputFileName);
        try {
          fs.writeFileSync(outputFile, JSON.stringify(result, null, 2));
        } catch (error) {
          console.log(`Failed to write json file for ${file}`);
        }
        console.log(`Output for ${file} saved to ${outputFile}`);
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
  } catch (error) {
    console.log(`Failed to escape string`);
  }

  try {
    const pdfTextFileName = outputFileName;
    const pdfData = await pdfParse(pdfBuffer);
    const pdfText = escapeString(pdfData.text);
    try {
      fs.writeFileSync(pdfTextFileName, pdfText);
    } catch (error) {
      console.log(`Failed to write plainText of file for ${pdfTextFileName}`);
    }
    const functions = [
      {
        name: "extractPurchaseOrderData",
        description: "Extracts structured data from a purchase order document",
        parameters: {
          type: "object",
          properties: {
            PO_number: {
              type: "string",
              description: "A unique identifier for the Purchase Order transaction",
            },
            OA_number: {
              type: "string",
              description: "A unique code provided by the supplier to the buyer for the order or invoice",
            },
            OA_date: {
              type: "string",
              format: "date",
              description: "The date the Order Acknowledgment was issued",
            },
            Ship_to_company: {
              type: "string",
              description: "The name of the company where the supplier will ship the order",
            },
            Ship_to_address_1: {
              type: "string",
              description: "The primary street address of the destination where the supplier will ship the order",
            },
            Ship_to_city: {
              type: "string",
              description: "City of the shipping address",
            },
            Ship_to_state: {
              type: "string",
              description: "State of the shipping address",
            },
            Ship_to_postal_code: {
              type: "string",
              description: "Postal code of the shipping address",
            },
            Ship_to_country: {
              type: ["string", "null"],
              description: "Country of the shipping address. Possibly empty if not given",
            },
            PO_total: {
              type: "number",
              description: "The total amount of the purchase order",
            },
            Estmated_ship_date: {
              type: ["string", "null"],
              format: "date",
              description: "Estimated shipping date for the entire purchase order provided by the supplier",
            },
            LineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  Line_number: {
                    type: ["string"],
                    description:
                      "The lineitem number of the purchase order item mentioned in the invoice. It must not be sequential. It may not start from 1. [i.e: 10,1,20,15]",
                  },
                  Qty: {
                    type: "number",
                    description: "Quantity of the product in the line item",
                  },
                  Qty_UOM: {
                    type: ["string", "null"],
                    description: "unit of measurement used to express the quantity of an item",
                  },
                  Part_number: {
                    type: ["string", "null"],
                    description: "The part number of the product or item",
                  },
                  Description: {
                    type: ["string", "null"],
                    description: "Description of the product or item",
                  },
                  Unit_Price: {
                    type: "number",
                    description: "Unit price of the item",
                  },
                  Price_UOM: {
                    type: ["string", "null"],
                    description: "unit of measurement used to price an item",
                  },
                  Line_Total: {
                    type: "number",
                    description: "Total cost for this line item",
                  },
                  Line_item_estmated_ship_date: {
                    type: ["string", "null"],
                    format: "date",
                    description: "Estimated shipping date for this line item provided by the supplier",
                  },
                },
                required: [
                  "Line_number",
                  "Qty",
                  "Part_number",
                  "Description",
                  "Unit_Price",
                  "Line_Total",
                  "Line_item_estmated_ship_date",
                  "Qty_UOM",
                  "Price_UOM",
                ],
                additionalProperties: false,
              },
              description: "List of line items in the purchase order",
            },
          },
          required: [
            "PO_number",
            "OA_number",
            "OA_date",
            "PO_total",
            "Ship_to_company",
            "Ship_to_address_1",
            "Ship_to_city",
            "Ship_to_state",
            "Ship_to_postal_code",
            "Estmated_ship_date",
            "Ship_to_country",
            "LineItems",
          ],
          additionalProperties: false,
        },
      },
    ];

    const response = await axios.post(
      process.env.OPENAI_API_URL,
      {
        model: process.env.OPENAI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are an AI assistant that extracts structured data from purchase order invoices. You are not creative and can only provide given information. if you do not find any information, make the relevant field null or empty string.",
          },
          {
            role: "user",
            content: pdfData.text,
          },
        ],
        functions: functions,
        function_call: { name: "extractPurchaseOrderData" },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const functionCall = response.data.choices[0].message.function_call;
    const structuredData = JSON.parse(functionCall.arguments);

    // Log token usage
    const tokensUsed = response.data.usage;
    console.log(
      `Tokens used - Prompt: ${tokensUsed.prompt_tokens}, Completion: ${tokensUsed.completion_tokens}, Total: ${tokensUsed.total_tokens}`
    );

    return structuredData;
  } catch (error) {
    console.error("Error processing PDF with ChatGPT:", error);
    return {
      error: "Failed to process PDF",
      details: error.message,
    };
  }
};

module.exports = { processPdfWithChatGPT };
