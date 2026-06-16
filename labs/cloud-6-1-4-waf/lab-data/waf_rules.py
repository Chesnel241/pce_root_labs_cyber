import re

# TODO: Complétez les expressions régulières pour détecter les attaques.

# 1. Détecter les injections SQL (ex: ' OR 1=1 --, UNION SELECT, DROP TABLE)
SQLI_REGEX = r""

# 2. Détecter les attaques XSS (ex: <script>alert(1)</script>, onload=, javascript:)
XSS_REGEX = r""

def is_malicious(payload: str) -> bool:
    """
    Retourne True si le payload est malveillant, False sinon.
    """
    if not payload:
        return False
        
    if SQLI_REGEX and re.search(SQLI_REGEX, payload, re.IGNORECASE):
        return True
        
    if XSS_REGEX and re.search(XSS_REGEX, payload, re.IGNORECASE):
        return True
        
    return False
