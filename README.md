![slanguage01](https://github.com/user-attachments/assets/91b3e138-938a-42ab-b5a2-26a8318df817)
# 🗣️ What is Slanguage  

**Slanguage** is a web application designed to **bridge the language gap across generations and cultures** by translating slang, memes, and modern expressions into universally understandable language.  

As Gen Z and Gen Alpha continue to shape their own digital dialects through trends and online culture, Slanguage helps users stay connected and communicate clearly — no matter their age or background.  

🔗 **Demo Video:** [Watch here](https://drive.google.com/file/d/1xpvgUcGkZ6cz8eh_tbFLmKWQEiQ3I_iC/view?usp=sharing)  

---

## 🧰 Tech Stack  

| Category | Technologies |
|-----------|---------------|
| **Frontend** | React, Tailwind CSS, JavaScript |
| **Backend** | Node.js, Express.js |
| **Database** | MongoDB, Mongoose |
| **AI Integration** | Gemini API (GenAI) |
| **Authentication** | Auth0 |
| **Other Tools** | Git, CORS |

---

## 🚀 Getting Started  

1. **Clone the repository**  
   ```bash
   git clone https://github.com/yourusername/Slanguage.git
   cd Slanguage
2. **Install dependencies**  
   ```bash
   npm install
3. **Set up environment variables**  
   Create a .env file and add your configuration settings (e.g., API keys, MongoDB credentials).
4. **Run the app**  
   ```bash
    npm run dev
5. Open your browser and go to your local host

---

## 🤝 Team
**Hackers**: Cris, Irene, Wilson, Natasha


**Hackathon**: Hack the Valley X — University of Toronto Scarborough

## 🌐 Connect with us
💬 Feedback and contributions are welcome!


Open an issue or submit a pull request to help improve **Slanguage**.


---

## 🧠 Training Pipeline Cheatsheet

1. **Collect multi-platform contexts**  
   ```bash
   cd backend
   npm run collect:data -- --collectors reddit,youtube \
     --reddit-subs slang,teenagers --reddit-limit 200 --reddit-comments true \
     --youtube-query "slang explained" --youtube-comments true
   ```
   Configure `REDDIT_*`, `YOUTUBE_API_KEY`, and friends in `backend/.env` before running.

2. **Run the C++ analyzer for insights**  
   ```bash
   cd backend/src/training/cpp
   g++ -std=c++17 -O2 slang_trainer.cpp -o slang_trainer
   ./slang_trainer --input ../../data/generated/slang.contexts.tsv \
     --output ../../data/generated/slang_language_model.json \
     --top-tokens 20 --related-limit 8 \
     --graph-output ../../data/generated/slang_related.tsv \
     --state-out ../../data/generated/slang_stats.dat \
     --clusters 10 --embedding-features 48 --min-pmi 0.05
   ```
   Next reloads can resume from the saved state with `--state-in`. Output now includes PMI-weighted context tokens, per-phrase quality scores, k-means cluster assignments, and a TSV edge list for graph/cluster tooling.
