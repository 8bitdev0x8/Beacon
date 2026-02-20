import pandas as pd
import json
import sys
from pathlib import Path


def excel_to_json(excel_path, json_path, sheet_name=0):
    try:
        # Check if file exists
        if not Path(excel_path).exists():
            print(f"Error: File '{excel_path}' not found.")
            return

        # Read Excel file
        df = pd.read_excel(excel_path, sheet_name=sheet_name, engine="openpyxl")

        # Clean column names (remove extra spaces)
        df.columns = df.columns.str.strip()

        # Required columns
        required_columns = [
            "Employer Name",
            "Permits Issued Grand Total"
        ]

        # Check required columns exist
        for col in required_columns:
            if col not in df.columns:
                print(f"Error: Column '{col}' not found in Excel file.")
                print("Available columns:", list(df.columns))
                return

        # If Career Page URL does not exist, create empty column
        if "Career Page URL" not in df.columns:
            df["Career Page URL"] = None

        # Select needed columns
        df_selected = df[
            ["Employer Name", "Permits Issued Grand Total", "Career Page URL"]
        ].copy()

        # Drop rows where Employer Name is missing
        df_selected = df_selected.dropna(subset=["Employer Name"])

        # Fill missing totals with 0 and convert to int
        df_selected["Permits Issued Grand Total"] = (
            df_selected["Permits Issued Grand Total"]
            .fillna(0)
            .astype(int)
        )

        # Rename columns for clean JSON keys
        df_selected = df_selected.rename(columns={
            "Employer Name": "employer_name",
            "Permits Issued Grand Total": "permits_total",
            "Career Page URL": "career_page"
        })

        # Convert to list of dictionaries
        data = df_selected.to_dict(orient="records")

        # Write JSON
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)

        print(f"Success! JSON file created at: {json_path}")

    except Exception as e:
        print("Unexpected error:", str(e))


if __name__ == "__main__":
    # Usage:
    # python script.py input.xlsx output.json

    if len(sys.argv) != 3:
        print("Usage: python script.py <input_excel_file> <output_json_file>")
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2]
        excel_to_json(input_file, output_file)