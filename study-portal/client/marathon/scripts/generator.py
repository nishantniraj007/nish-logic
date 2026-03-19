import json
import random
import os

def generate_profit_loss():
    # Template: A shopkeeper bought an item for Rs. {CP} and sold it at a {verb} of {percentage}%. Find the selling price.
    cp = random.randint(10, 50) * 100 # 1000 to 5000 in multiples of 100
    percentage = random.choice([10, 15, 20, 25, 30])
    is_profit = random.choice([True, False])
    
    if is_profit:
        verb = "profit"
        sp = int(cp * (1 + percentage/100))
    else:
        verb = "loss"
        sp = int(cp * (1 - percentage/100))

    # Generate Distractors
    offsets = [-1, 1, 2]
    random.shuffle(offsets)
    options = [f"Rs. {sp}"]
    for offset in offsets:
        # Create vaguely plausible wrong answers based on wrong percentages
        wrong_sp = int(cp * (1 + (percentage + offset * 5)/100)) if is_profit else int(cp * (1 - (percentage + offset * 5)/100))
        if wrong_sp == sp: wrong_sp += 10
        options.append(f"Rs. {wrong_sp}")
        
    random.shuffle(options)
    
    return {
        "category": "Quantitative Aptitude",
        "question": f"A shopkeeper bought an item for Rs. {cp} and sold it at a {verb} of {percentage}%. Find the selling price.",
        "options": options,
        "correct_answer": f"Rs. {sp}",
        "explanation": f"SP = CP * (1 {'+' if is_profit else '-'} Rate/100) = {cp} * (1 {'+' if is_profit else '-'} {percentage}/100) = {sp}",
        "trick": "Remember the multiplier formula directly: SP = CP * (1 ± R/100)."
    }

def generate_time_work():
    # Template: A can do a piece of work in {A} days and B can do it in {B} days. How long will they take if they work together?
    # Ensure A and B result in a clean integer or simple fraction by using known pairs based on LCM.
    pairs = [(10, 15), (12, 24), (20, 30), (15, 30), (12, 36), (18, 36)]
    a, b = random.choice(pairs)
    
    # Formula: (A * B) / (A + B)
    ans = (a * b) / (a + b)
    
    options = [f"{ans:g} days"]
    wrong_answers = [ans + 1, ans - 1, ans + 2]
    for w in wrong_answers:
        options.append(f"{w:g} days")
        
    random.shuffle(options)
    
    return {
        "category": "Quantitative Aptitude",
        "question": f"A can do a piece of work in {a} days and B can do it in {b} days. How long will they take if they work together?",
        "options": options,
        "correct_answer": f"{ans:g} days",
        "explanation": f"A's 1 day work = 1/{a}. B's = 1/{b}. Together = 1/{a} + 1/{b}. Total time = (A*B)/(A+B) = ({a}*{b})/({a+b}) = {ans:g} days",
        "trick": "Formula: (A * B) / (A + B)"
    }

def generate_syllogism():
    nouns = ["cats", "dogs", "birds", "trees", "cars", "bikes"]
    n1, n2, n3 = random.sample(nouns, 3)
    
    templates = [
        {
            "statements": f"All {n1} are {n2}. All {n2} are {n3}.",
            "conclusion_true": f"All {n1} are {n3}.",
            "conclusion_false": f"No {n1} are {n3}."
        },
        {
            "statements": f"Some {n1} are {n2}. No {n2} are {n3}.",
            "conclusion_true": f"Some {n1} are not {n3}.",
            "conclusion_false": f"All {n1} are {n3}."
        }
    ]
    
    t = random.choice(templates)
    
    options = [
        f"Only conclusion 1 follows",
        f"Only conclusion 2 follows",
        f"Both follow",
        f"Neither follows"
    ]
    
    # Let's say Conclusion 1 is always the True one in our setup logic, and Conclusion 2 is the False one.
    c1 = t["conclusion_true"]
    c2 = t["conclusion_false"]
    
    # Randomize order
    if random.choice([True, False]):
        c1, c2 = c2, c1
        correct = "Only conclusion 2 follows"
    else:
        correct = "Only conclusion 1 follows"
    
    return {
        "category": "Logical Reasoning",
        "question": f"Statements: {t['statements']}\nConclusion 1: {c1}\nConclusion 2: {c2}",
        "options": options,
        "correct_answer": correct,
        "explanation": "Use a Venn diagram overlap. The logical transitivity dictates the valid deduction.",
        "trick": "Draw circles representing subsets."
    }

if __name__ == '__main__':
    questions = []
    # Generate 6 questions 
    for _ in range(2):
        questions.append(generate_profit_loss())
        questions.append(generate_time_work())
        questions.append(generate_syllogism())
        
    random.shuffle(questions)
    
    output = {
        "metadata": {
            "generator": "TBG-Engine-v1",
            "difficulty": "Medium",
            "count": len(questions)
        },
        "questions": questions
    }
    
    print(json.dumps(output, indent=2))
