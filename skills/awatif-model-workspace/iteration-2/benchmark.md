# Skill Benchmark: awatif-model (iteration 2)

**Executor model**: sonnet
**Evals**: 2 (cornerstone-pressure-washing), 1 run per configuration

| Metric | With Skill | Without Skill |
|--------|------------|---------------|
| Pass rate | 80% | 80% |
| Time | 39.5s | 103.6s |
| Tokens | 47099 | 53301 |
| Tool calls | 11 | 13 |

## Failures
- With skill: no steel-member design block; added unrequested loads.
- Without skill: truss underside at 5.95 m instead of 5.08 m; added unrequested loads.
