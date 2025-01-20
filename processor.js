require("dotenv").config();
const pdfParse = require("pdf-parse");
const axios = require("axios");

const processPdfWithChatGPT = async (pdfBuffer) => {
  try {
    const pdfData = await pdfParse(pdfBuffer);

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
              type: "string",
              description: "Country of the shipping address. Possibly empty if not given",
            },
            PO_total: {
              type: "number",
              description: "The total amount of the purchase order",
            },
            Estmated_ship_date: {
              type: "string",
              format: "date",
              description: "Estimated shipping date for the entire purchase order provided by the supplier",
            },
            LineItems: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  Line_number: {
                    type: "number",
                    description: "The lineitem number of the purchase order item mentioned in the invoice",
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
            content: "You are an AI assistant that extracts structured data from invoices.",
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
