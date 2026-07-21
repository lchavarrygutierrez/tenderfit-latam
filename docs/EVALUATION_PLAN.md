# AI Evaluation Plan

## Build a ground-truth set

Label at least 10 tender documents manually. Use `manual-labels/tender-label-template.csv` and have a second reviewer check the most important requirements.

## Evaluate extraction separately from recommendation

### Extraction metrics

- Tender name: exact or acceptable match
- Entity: exact or acceptable match
- Deadline: exact match
- Estimated value and currency: exact match
- Mandatory requirements: precision and recall
- Required documents: precision and recall
- Disqualification risks: reviewer agreement
- Citation page: exact match
- Citation quote: supported / unsupported

### Recommendation metrics

For each company–tender pair, ask a human reviewer to label:

- APPLY
- REVIEW
- DO_NOT_APPLY

Then compare the model recommendation and record the reason for disagreement.

## Critical failure categories

Treat these as release blockers:

1. Invented requirement
2. Invented citation
3. Missed mandatory disqualifier
4. APPLY despite a clearly missing mandatory condition
5. Wrong deadline
6. Wrong monetary value by more than 5%

## Feedback loop

Store every correction as:

```text
Document ID
Company profile version
Model version
Prompt version
Incorrect output
Correct output
Failure category
Reviewer explanation
```

Do not improve prompts based on one anecdote. Group failures, revise, and rerun the full evaluation set.
