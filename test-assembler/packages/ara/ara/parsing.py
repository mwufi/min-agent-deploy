
import json
import re
from loguru import logger

def extract_json_from_string(s):
    """
    Extract and parse the first JSON object found in a string.
    Handles code block markers and extra text.
    """
    if not s:
        logger.debug("Empty string provided to JSON parser")
        return None
        
    original_s = s
    s = s.strip()
    
    # Remove code block markers if present
    if s.startswith("```json"):
        s = s[len("```json"):].strip()
    elif s.startswith("```"):
        s = s[3:].strip()
        
    if s.endswith("```"):
        s = s[:-3].strip()
    
    # Try to find JSON object or array
    patterns = [
        (r'\{[^{}]*\}', 'object'),  # Simple object
        (r'\{.*\}', 'nested_object'),  # Nested object
        (r'\[.*\]', 'array'),  # Array
    ]
    
    for pattern, pattern_type in patterns:
        match = re.search(pattern, s, re.DOTALL)
        if match:
            json_str = match.group(0)
            try:
                result = json.loads(json_str)
                logger.debug(f"Successfully parsed JSON {pattern_type}")
                return result
            except json.JSONDecodeError as e:
                logger.debug(f"Failed to parse {pattern_type}: {e}")
                continue
    
    # Fallback: try to parse the whole string
    try:
        result = json.loads(s)
        logger.debug("Successfully parsed full string as JSON")
        return result
    except json.JSONDecodeError as e:
        # Log only first 100 chars to avoid spam
        preview = original_s[:100] + "..." if len(original_s) > 100 else original_s
        logger.debug(f"Failed to parse JSON from: {preview}")
        logger.debug(f"JSON error: {e}")
        return None
