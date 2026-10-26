#!/usr/bin/env python3
"""
check_duplicate.py
Standalone Python script to check whether an Instagram reel already exists
in a user's database in Supabase and identify the folder name where it is saved.

Usage:
  python check_duplicate.py "<instagram_url_or_shortcode>" [user_id] [auth_token]
  python check_duplicate.py --url "<url>" --user "<user_id>" --token "<token>"

Output:
  JSON object to stdout:
  {"isDuplicate": true, "folderName": "Favorites", "folderId": "...", "reelId": "...", "shortcode": "..."}
  or
  {"isDuplicate": false, "shortcode": "..."}
"""

import sys
import os
import re
import json
import urllib.request
import urllib.parse
import urllib.error

DEFAULT_SUPABASE_URL = "https://jyxukgnvceauicdiuyuo.supabase.co"
DEFAULT_SUPABASE_KEY = "sb_publishable_s1w00m2nAYGaZW9H5cXfnQ_2J1WO_pi"

RESERVED_SLUGS = {
    'reel', 'reels', 'p', 'tv', 'share', 'explore', 'stories', 'videos', 'audio',
    'channel', 'direct', 'feed', 'accounts', 'developer', 'about', 'legal'
}

def extract_shortcode(url_or_code: str) -> str | None:
    if not url_or_code:
        return None
    url_or_code = url_or_code.strip()
    pattern = r'/(?:reels?|p|tv|share/reel)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url_or_code)
    candidate = match.group(1) if match else url_or_code.split('?')[0].split('#')[0].strip('/')
    if candidate and len(candidate) >= 5 and candidate.lower() not in RESERVED_SLUGS and re.match(r'^[A-Za-z0-9_-]+$', candidate):
        return candidate
    return None

def check_duplicate(url_or_shortcode: str, user_id: str | None = None, token: str | None = None, supabase_url: str | None = None, supabase_key: str | None = None) -> dict:
    shortcode = extract_shortcode(url_or_shortcode)
    if not shortcode:
        return {
            "isDuplicate": False,
            "error": f"Invalid URL or shortcode: {url_or_shortcode}",
            "shortcode": None
        }

    base_url = (supabase_url or os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or DEFAULT_SUPABASE_URL).rstrip('/')
    api_key = supabase_key or os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or DEFAULT_SUPABASE_KEY
    auth_token = token or os.environ.get("SUPABASE_TOKEN") or api_key

    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }

    # Query reels table using specific foreign key join folders!folder_id to avoid PGRST201 ambiguity
    query_params = [
        "select=id,folder_id,instagram_url,user_id,folders!folder_id(id,name,is_deleted)",
        "is_deleted=eq.false",
        f"instagram_url=ilike.*{urllib.parse.quote(shortcode)}*",
        "limit=1"
    ]
    if user_id:
        query_params.append(f"user_id=eq.{user_id}")

    endpoint = f"{base_url}/rest/v1/reels?{'&'.join(query_params)}"
    
    try:
        req = urllib.request.Request(endpoint, headers=headers, method="GET")
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            
            if isinstance(data, list) and len(data) > 0:
                item = data[0]
                folder_obj = item.get("folders") or {}
                if isinstance(folder_obj, list) and len(folder_obj) > 0:
                    folder_obj = folder_obj[0]
                
                folder_name = folder_obj.get("name") if isinstance(folder_obj, dict) else None
                folder_id = item.get("folder_id")

                # Fallback: if folder_name is missing but folder_id exists, lookup folder directly
                if not folder_name and folder_id:
                    try:
                        f_url = f"{base_url}/rest/v1/folders?select=name&id=eq.{folder_id}&limit=1"
                        f_req = urllib.request.Request(f_url, headers=headers, method="GET")
                        with urllib.request.urlopen(f_req, timeout=5) as f_resp:
                            f_data = json.loads(f_resp.read().decode('utf-8'))
                            if isinstance(f_data, list) and len(f_data) > 0:
                                folder_name = f_data[0].get("name")
                    except Exception:
                        pass

                return {
                    "isDuplicate": True,
                    "shortcode": shortcode,
                    "folderName": folder_name or "Folder",
                    "folderId": folder_id,
                    "reelId": item.get("id"),
                    "matchedUrl": item.get("instagram_url")
                }
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode('utf-8', errors='ignore')
        # If PGRST201 or similar, attempt fallback without join
        try:
            fallback_params = [
                "select=id,folder_id,instagram_url",
                "is_deleted=eq.false",
                f"instagram_url=ilike.*{urllib.parse.quote(shortcode)}*",
                "limit=1"
            ]
            if user_id:
                fallback_params.append(f"user_id=eq.{user_id}")
            fb_url = f"{base_url}/rest/v1/reels?{'&'.join(fallback_params)}"
            fb_req = urllib.request.Request(fb_url, headers=headers, method="GET")
            with urllib.request.urlopen(fb_req, timeout=5) as fb_resp:
                fb_data = json.loads(fb_resp.read().decode('utf-8'))
                if isinstance(fb_data, list) and len(fb_data) > 0:
                    fb_item = fb_data[0]
                    fid = fb_item.get("folder_id")
                    fname = "Folder"
                    if fid:
                        try:
                            f_url = f"{base_url}/rest/v1/folders?select=name&id=eq.{fid}&limit=1"
                            f_req = urllib.request.Request(f_url, headers=headers, method="GET")
                            with urllib.request.urlopen(f_req, timeout=5) as f_resp:
                                f_d = json.loads(f_resp.read().decode('utf-8'))
                                if f_d:
                                    fname = f_d[0].get("name") or "Folder"
                        except Exception:
                            pass
                    return {
                        "isDuplicate": True,
                        "shortcode": shortcode,
                        "folderName": fname,
                        "folderId": fid,
                        "reelId": fb_item.get("id")
                    }
        except Exception:
            pass

        return {
            "isDuplicate": False,
            "shortcode": shortcode,
            "apiError": err_msg
        }
    except Exception as ex:
        return {
            "isDuplicate": False,
            "shortcode": shortcode,
            "error": str(ex)
        }

    return {
        "isDuplicate": False,
        "shortcode": shortcode
    }

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL or shortcode provided", "usage": "python check_duplicate.py <url> [user_id] [token]"}))
        sys.exit(1)

    url_or_code = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 and not sys.argv[2].startswith('-') else None
    token = sys.argv[3] if len(sys.argv) > 3 and not sys.argv[3].startswith('-') else None

    # Support flags: --url, --user, --token
    for i, arg in enumerate(sys.argv):
        if arg == '--url' and i + 1 < len(sys.argv):
            url_or_code = sys.argv[i + 1]
        elif (arg == '--user' or arg == '--user_id') and i + 1 < len(sys.argv):
            user_id = sys.argv[i + 1]
        elif arg == '--token' and i + 1 < len(sys.argv):
            token = sys.argv[i + 1]

    result = check_duplicate(url_or_code, user_id=user_id, token=token)
    print(json.dumps(result, indent=2))
    sys.exit(0 if not result.get("error") else 1)

if __name__ == "__main__":
    main()
