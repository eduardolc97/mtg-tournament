-- Restore: Junho 1 (junho/2026) — Liga CMD 100 semanal, 20 jogadores, 3 rodadas
-- Run in Supabase SQL Editor after db:setup

BEGIN;

-- New players not in the original preset list
INSERT INTO players (id, nickname, nickname_key, created_at, updated_at)
VALUES
  ('plr-mao', 'Mão', 'mão', NOW(), NOW()),
  ('plr-juan', 'Juan', 'juan', NOW(), NOW()),
  ('plr-furtado', 'Furtado', 'furtado', NOW(), NOW()),
  ('plr-shiryu', 'Shiryu', 'shiryu', NOW(), NOW()),
  ('plr-kath', 'Kath', 'kath', NOW(), NOW()),
  ('plr-nicolas', 'Nicolas', 'nicolas', NOW(), NOW()),
  ('plr-xapex', 'Xapex', 'xapex', NOW(), NOW()),
  ('plr-stit', 'Stit', 'stit', NOW(), NOW())
ON CONFLICT (nickname_key) DO NOTHING;

-- Tournament
INSERT INTO tournaments (
  id,
  name,
  created_at,
  rounds,
  league_year,
  league_month,
  modality,
  doubles_include_fourth_swiss_round
)
VALUES (
  'tournament-junho-1-2026',
  'Junho 1',
  '2026-06-01T19:00:00.000Z',
  $rounds$
[
  {
    "id": "round-1",
    "number": 1,
    "tables": [
      {
        "id": "round-1-table-1",
        "players": [
          {"id": "ej1-ulian"},
          {"id": "ej1-elton"},
          {"id": "ej1-gege"},
          {"id": "ej1-mao"}
        ],
        "results": [
          {"playerId": "ej1-ulian", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-elton", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-gege", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-mao", "outcome": {"type": "place", "place": 1}, "points": 5}
        ]
      },
      {
        "id": "round-1-table-2",
        "players": [
          {"id": "ej1-vini"},
          {"id": "ej1-juan"},
          {"id": "ej1-ricardinho"},
          {"id": "ej1-hudson"}
        ],
        "results": [
          {"playerId": "ej1-vini", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-juan", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-ricardinho", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-hudson", "outcome": {"type": "place", "place": 4}, "points": 0}
        ]
      },
      {
        "id": "round-1-table-3",
        "players": [
          {"id": "ej1-gersao"},
          {"id": "ej1-furtado"},
          {"id": "ej1-shiryu"},
          {"id": "ej1-kath"}
        ],
        "results": [
          {"playerId": "ej1-gersao", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-furtado", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-shiryu", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-kath", "outcome": {"type": "place", "place": 3}, "points": 1}
        ]
      },
      {
        "id": "round-1-table-4",
        "players": [
          {"id": "ej1-duke"},
          {"id": "ej1-itao"},
          {"id": "ej1-ron"},
          {"id": "ej1-nicolas"}
        ],
        "results": [
          {"playerId": "ej1-duke", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-itao", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-ron", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-nicolas", "outcome": {"type": "place", "place": 3}, "points": 1}
        ]
      },
      {
        "id": "round-1-table-5",
        "players": [
          {"id": "ej1-eduardo"},
          {"id": "ej1-xapex"},
          {"id": "ej1-stit"},
          {"id": "ej1-luqueta"}
        ],
        "results": [
          {"playerId": "ej1-eduardo", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-xapex", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-stit", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-luqueta", "outcome": {"type": "place", "place": 2}, "points": 3}
        ]
      }
    ]
  },
  {
    "id": "round-2",
    "number": 2,
    "tables": [
      {
        "id": "round-2-table-1",
        "players": [
          {"id": "ej1-nicolas"},
          {"id": "ej1-ulian"},
          {"id": "ej1-luqueta"},
          {"id": "ej1-kath"}
        ],
        "results": [
          {"playerId": "ej1-nicolas", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-ulian", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-luqueta", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-kath", "outcome": {"type": "place", "place": 3}, "points": 1}
        ]
      },
      {
        "id": "round-2-table-2",
        "players": [
          {"id": "ej1-duke"},
          {"id": "ej1-gege"},
          {"id": "ej1-vini"},
          {"id": "ej1-stit"}
        ],
        "results": [
          {"playerId": "ej1-duke", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-gege", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-vini", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-stit", "outcome": {"type": "place", "place": 1}, "points": 5}
        ]
      },
      {
        "id": "round-2-table-3",
        "players": [
          {"id": "ej1-mao"},
          {"id": "ej1-itao"},
          {"id": "ej1-juan"},
          {"id": "ej1-furtado"}
        ],
        "results": [
          {"playerId": "ej1-mao", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-itao", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-juan", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-furtado", "outcome": {"type": "place", "place": 4}, "points": 0}
        ]
      },
      {
        "id": "round-2-table-4",
        "players": [
          {"id": "ej1-ron"},
          {"id": "ej1-ricardinho"},
          {"id": "ej1-gersao"},
          {"id": "ej1-xapex"}
        ],
        "results": [
          {"playerId": "ej1-ron", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-ricardinho", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-gersao", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-xapex", "outcome": {"type": "place", "place": 2}, "points": 3}
        ]
      },
      {
        "id": "round-2-table-5",
        "players": [
          {"id": "ej1-elton"},
          {"id": "ej1-shiryu"},
          {"id": "ej1-eduardo"},
          {"id": "ej1-hudson"}
        ],
        "results": [
          {"playerId": "ej1-elton", "outcome": {"type": "tie"}, "points": 1},
          {"playerId": "ej1-shiryu", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-eduardo", "outcome": {"type": "tie"}, "points": 1},
          {"playerId": "ej1-hudson", "outcome": {"type": "tie"}, "points": 1}
        ]
      }
    ]
  },
  {
    "id": "round-3",
    "number": 3,
    "tables": [
      {
        "id": "round-3-table-1",
        "isFinalTable": true,
        "players": [
          {"id": "ej1-mao"},
          {"id": "ej1-ricardinho"},
          {"id": "ej1-xapex"},
          {"id": "ej1-luqueta"}
        ],
        "results": [
          {"playerId": "ej1-mao", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-ricardinho", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-xapex", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-luqueta", "outcome": {"type": "place", "place": 1}, "points": 5}
        ]
      },
      {
        "id": "round-3-table-2",
        "players": [
          {"id": "ej1-stit"},
          {"id": "ej1-ron"},
          {"id": "ej1-kath"},
          {"id": "ej1-elton"}
        ],
        "results": [
          {"playerId": "ej1-stit", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-ron", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-kath", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-elton", "outcome": {"type": "place", "place": 2}, "points": 3}
        ]
      },
      {
        "id": "round-3-table-3",
        "players": [
          {"id": "ej1-gege"},
          {"id": "ej1-gersao"},
          {"id": "ej1-juan"},
          {"id": "ej1-eduardo"}
        ],
        "results": [
          {"playerId": "ej1-gege", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-gersao", "outcome": {"type": "tie"}, "points": 1},
          {"playerId": "ej1-juan", "outcome": {"type": "tie"}, "points": 1},
          {"playerId": "ej1-eduardo", "outcome": {"type": "place", "place": 2}, "points": 3}
        ]
      },
      {
        "id": "round-3-table-4",
        "players": [
          {"id": "ej1-hudson"},
          {"id": "ej1-furtado"},
          {"id": "ej1-duke"},
          {"id": "ej1-ulian"}
        ],
        "results": [
          {"playerId": "ej1-hudson", "outcome": {"type": "place", "place": 4}, "points": 0},
          {"playerId": "ej1-furtado", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-duke", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-ulian", "outcome": {"type": "place", "place": 1}, "points": 5}
        ]
      },
      {
        "id": "round-3-table-5",
        "players": [
          {"id": "ej1-vini"},
          {"id": "ej1-itao"},
          {"id": "ej1-shiryu"},
          {"id": "ej1-nicolas"}
        ],
        "results": [
          {"playerId": "ej1-vini", "outcome": {"type": "place", "place": 2}, "points": 3},
          {"playerId": "ej1-itao", "outcome": {"type": "place", "place": 1}, "points": 5},
          {"playerId": "ej1-shiryu", "outcome": {"type": "place", "place": 3}, "points": 1},
          {"playerId": "ej1-nicolas", "outcome": {"type": "place", "place": 4}, "points": 0}
        ]
      }
    ]
  }
]
  $rounds$::jsonb,
  2026,
  6,
  'weekly_cmd100',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  rounds = EXCLUDED.rounds,
  league_year = EXCLUDED.league_year,
  league_month = EXCLUDED.league_month,
  modality = EXCLUDED.modality;

-- Tournament participants (entry id -> global player)
INSERT INTO tournament_participants (id, tournament_id, player_id, partner_id)
SELECT v.entry_id, 'tournament-junho-1-2026', p.id, NULL
FROM (VALUES
  ('ej1-ulian', 'ulian'),
  ('ej1-elton', 'elton'),
  ('ej1-gege', 'gege'),
  ('ej1-mao', 'mão'),
  ('ej1-vini', 'vini'),
  ('ej1-juan', 'juan'),
  ('ej1-ricardinho', 'ricardinho'),
  ('ej1-hudson', 'hudson'),
  ('ej1-gersao', 'gersão'),
  ('ej1-furtado', 'furtado'),
  ('ej1-shiryu', 'shiryu'),
  ('ej1-kath', 'kath'),
  ('ej1-duke', 'duke'),
  ('ej1-itao', 'itão'),
  ('ej1-ron', 'ron'),
  ('ej1-nicolas', 'nicolas'),
  ('ej1-eduardo', 'eduardo'),
  ('ej1-xapex', 'xapex'),
  ('ej1-stit', 'stit'),
  ('ej1-luqueta', 'luqueta')
) AS v(entry_id, nick_key)
JOIN players p ON p.nickname_key = v.nick_key
ON CONFLICT (id) DO NOTHING;

COMMIT;
