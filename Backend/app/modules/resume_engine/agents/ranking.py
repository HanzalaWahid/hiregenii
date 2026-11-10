from __future__ import annotations

from dataclasses import dataclass
from typing import List


@dataclass(frozen=True)
class RankedCandidate:
    candidate_id: int
    score: float


class RankingAgent:
    """
    Agent 4: Ranking Agent
    Rank candidates per job and return Top 5.
    """

    def rank_top_k(self, candidates: List[RankedCandidate], k: int = 5) -> List[RankedCandidate]:
        candidates_sorted = sorted(candidates, key=lambda c: c.score, reverse=True)
        return candidates_sorted[:k]

