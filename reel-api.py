from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import instaloader
import requests
from io import BytesIO
import re

app = Flask(__name__)
CORS(app)  # CORS enable

def extract_shortcode(url):
    m = re.search(r'instagram\.com/(?:reel|p|tv)/([A-Za-z0-9_-]+)', url)
    return m.group(1) if m else None

@app.route('/api/download-reel', methods=['POST'])
def download_reel():
    data = request.json or {}
    url = data.get("url")
    sc = extract_shortcode(url or "")
    if not sc:
        return jsonify({"error": "Please provide a valid Instagram reel/p URL"}), 400

    L = instaloader.Instaloader(save_metadata=False, download_video_thumbnails=False)
    try:
        post = instaloader.Post.from_shortcode(L.context, sc)
        return jsonify({
            "success": True,
            "preview": post.url,   # IG CDN image link
            "author": post.owner_username,
            "downloads": [{
                "url": post.video_url,
                "type": "mp4"
            }]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/proxy-thumbnail')
def proxy_thumbnail():
    image_url = request.args.get("url")
    if not image_url:
        return '', 404
    try:
        resp = requests.get(image_url, timeout=5)
        resp.raise_for_status()
        return send_file(BytesIO(resp.content), mimetype='image/jpeg')
    except Exception as e:
        print("Thumbnail proxy error:", e)
        return '', 500

if __name__ == "__main__":
    app.run(port=8000)
