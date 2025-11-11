from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Sentiment Aura API")

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/response validation
class TextInput(BaseModel):
    text: str

class SentimentResponse(BaseModel):
    sentiment_score: float
    sentiment_type: str
    intensity: float
    keywords: list[str]

# Environment variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

# Validate API key
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in environment variables!")

# Health check
@app.get("/")
async def root():
    return {
        "status": "running",
        "message": "Sentiment Aura API is live",
        "version": "1.0.0"
    }

# Sentiment response from Groq
@app.post("/process_text", response_model=SentimentResponse)
async def process_text(input_data: TextInput):
    prompt = f"""Analyze the sentiment of the following text and response ONLY with valid JSON (no markdown, no code blocks, no explanation).
                
                Text: "{input_data.text}"
                
                Response format (respond with ONLY this JSON, nothing else):
                {{
                    "sentiment_score": <float between -1.0 and 1.0>,
                    "sentiment_type": "<positive, negative, or neutral>",
                    "intensity": <float between 0.0 and 1.0>,
                    "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"]
                }}
                
                Rules:
                - sentiment_score: -1.0 (very negative) to 0.0 (neutral) to 1.0 (very positive)
                - sentiment_type: "positive" if score > 0.2, "negative" if score < -0.2, else "neutral"
                - intensity: 0.0 (very weak emotion) to 1.0 (very strong emotion)
                - keywords: Extract 3-5 most important emotional or topical words from the text

                Examples:
                Text: "I absolutely love this!" -> {{"sentiment_score": 0.95, "sentiment_type": "positive", "intensity": 0.95, "keywords": ["absolutely", "love", "enthusiasm"]}}
                Text: "This is terrible and frustrating." -> {{"sentiment_score": -0.85, "sentiment_type": "negative", "intensity": 0.85, "keywords": ["terrible", "frustrating", "distress"]}}
                Text: "Let me think about it." -> {{"sentiment_score": 0.0, "sentiment_type": "neutral", "intensity": 0.2, "keywords": ["think", "consider", "noncommittal"]}}

                Remember: Respond ONLY with the JSON object, no other text!
                """

    # Call Groq API
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.1-8b-instant",
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a sentiment analysis expert. Respond only with valid JSON."
                        },
                        {
                            "role": "user",
                            "content": prompt
                        }
                    ],
                    "temperature": 0.3,
                    "max_tokens": 200
                }
            )

            # Check for HTTP errors
            response.raise_for_status

            # Parse Groq response
            result = response.json()
            print(result)
            content = result["choices"][0]["message"]["content"]
            
            # Clean up the response
            content = content.strip()
            
            # Remove markdown code blocks
            if content.startswith("```"):
                lines = content.split("\n")
                json_lines = []
                in_json = False

                for line in lines:
                    if line.startswith("```"):
                        in_json = not in_json
                        continue
                    if in_json or (line.strip().startswith("{") or json_lines):
                        json_lines.append(line)
                        if line.strip().endswith("}"):
                            break
                
                content = "\n".join(json_lines)
            
            content = content.strip()

            # Parse to JSON
            sentiment_data = json.loads(content)

            return SentimentResponse(**sentiment_data)

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Response to LLM time out! Please try again!"
        )

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with LLM API: {str(e)}!"
        )
    
    except json.JSONDecodeError as e:
        print(f"JSON Parse Error! Content was: {content}!")
        return SentimentResponse(
            sentiment_score=0.0,
            sentiment_type="neutral",
            intensity=0.0,
            keywords=["error", "json", "parsing"]
        )
    
    except KeyError as e:
        raise HTTPException(
            status_code = 500,
            detail=f"Unexpected response format from LLM: {str(e)}!"
        )
    
    except Exception as e:
        print(f"Unexpected error: {str(e)}!")
        raise HTTPException(
            status_code = 500,
            detail=f"Internal server error: {str(e)}!"
        )