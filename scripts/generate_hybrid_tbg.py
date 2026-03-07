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

# 3. GK & Current Affairs (The Scraper Method Placeholder)
def generate_gk_current_affairs(index):
    # This acts as a stub for the Web Scraper pulling data from news APIs.
    gk_db = [
        {
            "q": "Which country recently won the Thomas Cup?",
            "c": "India",
            "opts": ["India", "Indonesia", "China", "Denmark"],
            "exp": "India made history by winning the Thomas Cup for the first time."
        },
        {
            "q": "Who won the ICC Men's Cricket World Cup 2023?",
            "c": "Australia",
            "opts": ["India", "Australia", "England", "South Africa"],
            "exp": "Australia defeated India in the final to win the 2023 ICC World Cup."
        },
        {
            "q": "Which city hosted the G20 Summit in 2023?",
            "c": "New Delhi",
            "opts": ["New Delhi", "Bali", "Rome", "Riyadh"],
            "exp": "The 2023 G20 New Delhi summit was the eighteenth meeting of G20."
        },
        {
            "q": "What is the name of India's first solar mission?",
            "c": "Aditya-L1",
            "opts": ["Aditya-L1", "Surya-1", "Bhaskara-L", "Chandrayaan-3"],
            "exp": "Aditya-L1 is a coronalography spacecraft designed to study the solar atmosphere."
        },
        {
            "q": "Which film won the Best Picture at the 96th Academy Awards?",
            "c": "Oppenheimer",
            "opts": ["Oppenheimer", "Barbie", "Poor Things", "Killers of the Flower Moon"],
            "exp": "Oppenheimer won the Academy Award for Best Picture in 2024."
        },
        {
            "q": "Which country officially became the 32nd member of NATO in 2024?",
            "c": "Sweden",
            "opts": ["Sweden", "Finland", "Ukraine", "Georgia"],
            "exp": "Sweden officially became the 32nd member of NATO in March 2024."
        }
    ]
    item = gk_db[index % len(gk_db)]
    options = item["opts"].copy()
    random.shuffle(options)
    return {
        "question": item["q"],
        "category": "Current Affairs",
        "options": options,
        "correct_answer": item["c"],
        "explanation": item["exp"]
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
    
    # 6 GK/Current Affairs 
    gk_questions = []
    for i in range(6):
        gk_questions.append(generate_gk_current_affairs(i))
        
    # Append GK at the end
    questions.extend(gk_questions)
    
    output = {
        "metadata": {
            "difficulty": "upsc",
            "generated_at": datetime.now().isoformat(),
            "type": "Hybrid TBG + AI Engine",
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
