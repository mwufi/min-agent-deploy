
import json
import re

def extract_json_from_string(s):
    """
    Extract and parse the first JSON object found in a string.
    Handles code block markers and extra text.
    """
    # Remove code block markers if present
    s = s.strip()
    if s.startswith("```json"):
        s = s[len("```json"):].strip()
    if s.endswith("```"):
        s = s[:-3].strip()
    # Try to find the first JSON object using regex
    match = re.search(r'\{.*\}', s, re.DOTALL)
    if match:
        json_str = match.group(0)
        try:
            return json.loads(json_str)
        except Exception as e:
            print(f"Error parsing JSON: {e}")
            return None
    # Fallback: try to parse the whole string
    try:
        return json.loads(s)
    except Exception as e:
        print(f"Error parsing JSON: {e}")
        return None
