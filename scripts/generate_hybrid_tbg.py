import json
import random
import os
from datetime import datetime

# 1. Quantitative Aptitude (The Math Engine) - Time & Work
def generate_time_work():
    # A can complete a piece of work in X days while B can complete the same work in Y days...
    # Ensure answer is integer
    pairs = [(10, 15, 6), (20, 30, 12), (12, 24, 8), (15, 30, 10), (10, 40, 8), (20, 60, 15), (30, 60, 20)]
    x, y, ans = random.choice(pairs)
    
    question = f"A can complete a piece of work in {x} days while B can complete the same work in {y} days. If they work together, in how many days will they complete the work?"
    
    options = [str(ans), str(ans + 2), str(ans - 1), str(ans + 4)]
    # randomize options maintaining correctness
    options_set = set(options)
    while len(options_set) < 4:
        options_set.add(str(ans + random.randint(1, 5)))
    options = list(options_set)
    random.shuffle(options)
    
    explanation = f"1/A + 1/B = 1/{x} + 1/{y} = ({y}+{x})/({x}*{y}) = 1/{ans}. So they complete it in {ans} days."
    return {
        "question": question,
        "category": "Quantitative Aptitude",
        "options": options,
        "correct_answer": str(ans),
        "explanation": explanation
    }

def generate_profit_loss():
    cp = random.randint(10, 50) * 10
    profit_pct = random.choice([10, 20, 25, 30, 40, 50])
    sp = int(cp * (1 + profit_pct/100))
    
    question = f"If an article is bought for Rs. {cp} and sold at a profit of {profit_pct}%, what is the selling price?"
    ans = sp
    
    options = [str(ans), str(ans + 10), str(ans - 20), str(ans + int(cp*0.1))]
    options_set = set(options)
    while len(options_set) < 4:
        options_set.add(str(ans + random.randint(1, 4)*5))
    options = list(options_set)
    random.shuffle(options)
    
    explanation = f"SP = CP * (1 + Profit%/100) = {cp} * (1 + {profit_pct}/100) = Rs. {sp}."
    return {
        "question": question,
        "category": "Quantitative Aptitude",
        "options": options,
        "correct_answer": str(ans),
        "explanation": explanation
    }

# 2. Logical Reasoning (The Pattern Generator) - Number Series
def generate_number_series():
    q_type = random.choice(['arithmetic', 'geometric'])
    
    if q_type == 'arithmetic':
        start = random.randint(2, 10)
        diff = random.randint(3, 8)
        series = [start + i*diff for i in range(5)]
        ans = series[-1]
        series_str = ", ".join(map(str, series[:-1])) + ", ?"
        explanation = f"The series is an Arithmetic Progression with a common difference of {diff}. Next term: {series[-2]} + {diff} = {ans}."
    else:
        start = random.randint(2, 5)
        ratio = random.choice([2, 3])
        series = [start * (ratio**i) for i in range(5)]
        ans = series[-1]
        series_str = ", ".join(map(str, series[:-1])) + ", ?"
        explanation = f"The series is a Geometric Progression with a common ratio of {ratio}. Next term: {series[-2]} * {ratio} = {ans}."
    
    q_text = f"Find the missing number in the series: {series_str}"
    
    options = [str(ans)]
    while len(options) < 4:
        fake_ans = str(ans + random.randint(-15, 20))
        if fake_ans not in options and int(fake_ans) > 0:
            options.append(fake_ans)
            
    random.shuffle(options)
    
    return {
        "question": q_text,
        "category": "Logical Reasoning",
        "options": options,
        "correct_answer": str(ans),
        "explanation": explanation
    }

def generate_syllogism():
    entities = [
        ("Dogs", "Cats", "Animals"), 
        ("Cars", "Trucks", "Vehicles"), 
        ("Doctors", "Engineers", "Professionals"),
        ("Apples", "Fruits", "Foods"),
        ("Pens", "Pencils", "Stationery")
    ]
    e1, e2, e3 = random.choice(entities)
    
    statements = f"Statements:\n1. All {e1} are {e2}.\n2. All {e2} are {e3}."
    conclusion_true = f"All {e1} are {e3}."
    conclusion_false = f"All {e3} are {e1}."
    
    q_text = f"Consider the following statements and decide which conclusion logically follows.\n{statements}"
    
    options = [
        conclusion_true,
        conclusion_false,
        f"Some {e3} are not {e1}.",
        f"No {e1} are {e3}."
    ]
    correct = conclusion_true
    random.shuffle(options)
    
    explanation = f"If all A are B and all B are C, then all A must be C. Therefore, '{conclusion_true}' is the logically certain conclusion."
    
    return {
        "question": q_text,
        "category": "Logical Reasoning",
        "options": options,
        "correct_answer": correct,
        "explanation": explanation
    }

import urllib.request
import urllib.error

# 3. GK & Current Affairs (Live Fetch from Headless DB)
def fetch_live_gk_data():
    urls = [
        "https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/current_affairs/latest.json",
        "https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/history/level_7.json",
        "https://raw.githubusercontent.com/nishantniraj007/nish-logic-gk-database/master/geography/level_7.json"
    ]
    all_live_questions = []
    
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(req, timeout=5) as response:
                data = json.loads(response.read().decode())
                if isinstance(data, list):
                    all_live_questions.extend(data)
        except (urllib.error.URLError, json.JSONDecodeError) as e:
            print(f"Warning: Failed to fetch or parse {url}: {e}")
            pass
            
    return all_live_questions

def generate_gk_current_affairs(index, live_data_pool):
    # This acts as a fallback stub if the DB is empty
    gk_db = [
        {
            "category": "Current Affairs",
            "question": "Which country recently won the Thomas Cup?",
            "options": ["India", "Indonesia", "China", "Denmark"],
            "correct_answer": "India",
            "explanation": "India made history by winning the Thomas Cup for the first time."
        },
        {
            "category": "Current Affairs",
            "question": "Who won the ICC Men's Cricket World Cup 2023?",
            "options": ["India", "Australia", "England", "South Africa"],
            "correct_answer": "Australia",
            "explanation": "Australia defeated India in the final to win the 2023 ICC World Cup."
        },
        {
            "category": "Current Affairs",
            "question": "Which city hosted the G20 Summit in 2023?",
            "options": ["New Delhi", "Bali", "Rome", "Riyadh"],
            "correct_answer": "New Delhi",
            "explanation": "The 2023 G20 New Delhi summit was the eighteenth meeting of G20."
        },
        {
            "category": "Current Affairs",
            "question": "What is the name of India's first solar mission?",
            "options": ["Aditya-L1", "Surya-1", "Bhaskara-L", "Chandrayaan-3"],
            "correct_answer": "Aditya-L1",
            "explanation": "Aditya-L1 is a coronalography spacecraft designed to study the solar atmosphere."
        },
        {
            "category": "Current Affairs",
            "question": "Which film won the Best Picture at the 96th Academy Awards?",
            "options": ["Oppenheimer", "Barbie", "Poor Things", "Killers of the Flower Moon"],
            "correct_answer": "Oppenheimer",
            "explanation": "Oppenheimer won the Academy Award for Best Picture in 2024."
        },
        {
            "category": "Current Affairs",
            "question": "Which country officially became the 32nd member of NATO in 2024?",
            "options": ["Sweden", "Finland", "Ukraine", "Georgia"],
            "correct_answer": "Sweden",
            "explanation": "Sweden officially became the 32nd member of NATO in March 2024."
        }
    ]
    
    if live_data_pool and len(live_data_pool) > index:
        item = live_data_pool[index]
    else:
        # Fallback to local stub
        item = gk_db[index % len(gk_db)]
        
    options = item.get("options", []).copy()
    if len(options) >= 4:
        random.shuffle(options)
    
    return {
        "question": item.get("question", "Unknown Question"),
        "category": item.get("category", "General Knowledge"),
        "options": options,
        "correct_answer": item.get("correct_answer", ""),
        "explanation": item.get("explanation", ""),
        "trick": item.get("trick", "") # Keep it matching the standard schema
    }

def main():
    questions = []
    
    # 12 Math/Logic TBG:
    # 3x Time and Work
    for _ in range(3):
        questions.append(generate_time_work())
    # 3x Profit Loss
    for _ in range(3):
        questions.append(generate_profit_loss())
    # 3x Number Series
    for _ in range(3):
        questions.append(generate_number_series())
    # 3x Syllogisms
    for _ in range(3):
        questions.append(generate_syllogism())
        
    random.shuffle(questions)
    
    # 6 GK/Current Affairs from Headless DB
    live_data_pool = fetch_live_gk_data()
    if len(live_data_pool) > 6:
        live_data_pool = random.sample(live_data_pool, 6) # Select 6 random distinct questions
        
    gk_questions = []
    for i in range(6):
        gk_questions.append(generate_gk_current_affairs(i, live_data_pool))
        
    # Append GK at the end
    questions.extend(gk_questions)
    
    output = {
        "metadata": {
            "difficulty": "upsc",
            "generated_at": datetime.now().isoformat(),
            "type": "Hybrid TBG + Live DB Sync",
            "total_questions": len(questions)
        },
        "questions": questions
    }
    
    # Setup paths relative to the script location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    data_dir = os.path.join(project_root, "test-deploy", "data")
    
    os.makedirs(data_dir, exist_ok=True)
    out_path = os.path.join(data_dir, "hybrid_upsc.json")
    
    with open(out_path, "w") as f:
        json.dump(output, f, indent=4)
        
    print(f"Generated {len(questions)} hybrid questions at {out_path}")

if __name__ == "__main__":
    main()
