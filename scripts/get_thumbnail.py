import instaloader
import sys
import json
import re
import os
import requests

def extract_shortcode(url):
    # Matches /reel/abcde, /reels/abcde, /p/abcde, /tv/abcde, /share/reel/abcde
    pattern = r'/(?:reels?|p|tv|share/reel)/([A-Za-z0-9_-]+)'
    match = re.search(pattern, url)
    if match:
        return match.group(1)
    
    # Fallback if the user input is just the shortcode itself
    clean_url = url.strip().split('?')[0].strip('/')
    if '/' not in clean_url and len(clean_url) > 0:
        return clean_url
    return None

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No URL or shortcode provided"}), file=sys.stderr)
        sys.exit(1)
        
    reel_url = sys.argv[1]
    shortcode = extract_shortcode(reel_url)
    
    if not shortcode:
        print(json.dumps({"error": f"Could not parse shortcode from URL: {reel_url}"}), file=sys.stderr)
        sys.exit(1)
        
    # Define target directory relative to the script path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    target_dir = os.path.join(script_dir, '..', 'public', 'thumbnails')
    os.makedirs(target_dir, exist_ok=True)
    
    target_filename = f"{shortcode}.jpg"
    target_path = os.path.join(target_dir, target_filename)
    local_url = f"/thumbnails/{target_filename}"
    
    # If the file already exists locally, return it immediately to save requests
    if os.path.exists(target_path):
        result = {
            "username": "instagram_user",
            "thumbnail_url": local_url,
            "shortcode": shortcode,
            "cached": True
        }
        print(json.dumps(result))
        sys.exit(0)
        
    L = instaloader.Instaloader()
    
    try:
        post = instaloader.Post.from_shortcode(L.context, shortcode)
        
        # FIX: Changed post.url (HTML page) to post.date_url (Direct Image CDN link)
        image_cdn_url = post.date_url 
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        img_response = requests.get(image_cdn_url, headers=headers, timeout=15)
        if img_response.status_code == 200:
            with open(target_path, 'wb') as f:
                f.write(img_response.content)
        else:
            raise Exception(f"Failed to download image from CDN: HTTP {img_response.status_code}")
            
        result = {
            "username": post.owner_username,
            "thumbnail_url": local_url,
            "shortcode": shortcode,
            "cached": False
        }
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()