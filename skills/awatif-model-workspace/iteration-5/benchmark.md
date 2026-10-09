# Skill Benchmark: awatif-model (iteration 5, with skill, 3 runs each)

| Eval | Pass rate (mean ± sd) | Per run |
|------|-----------------------|---------|
| 1 | 95% ± 7% | 6/7, 7/7, 7/7 |
| 2 | 93% ± 5% | 9/10, 10/10, 9/10 |

## Failures
- Eval 1 run 1: steel-member IPE 300 instead of generic-member (no section given).
- Eval 2 runs 1 and 3: columns stop at the truss underside (5.08 m) instead of the full 5.963 m. Run 3 also has a duplicate point at z=5.08.
