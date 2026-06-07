-- Core schemas for ANIMALIA Agents

CREATE TABLE IF NOT EXISTS species (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'herbivore' or 'predator'
    base_speed FLOAT DEFAULT 1.0,
    base_vision INT DEFAULT 5,
    max_energy FLOAT DEFAULT 100.0,
    max_hunger FLOAT DEFAULT 100.0,
    max_thirst FLOAT DEFAULT 100.0,
    reproduction_threshold FLOAT DEFAULT 80.0
);

CREATE TABLE IF NOT EXISTS worlds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seed INT NOT NULL,
    width INT NOT NULL,
    height INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tiles (
    world_id INT,
    x INT,
    y INT,
    biome VARCHAR(50) NOT NULL, -- 'grassland', 'forest', 'water', 'mountain'
    elevation FLOAT DEFAULT 0.0,
    PRIMARY KEY (world_id, x, y),
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    world_id INT,
    x INT,
    y INT,
    type VARCHAR(50) NOT NULL, -- 'food', 'water'
    amount FLOAT NOT NULL,
    max_amount FLOAT NOT NULL,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agents (
    id VARCHAR(50) PRIMARY KEY,
    world_id INT,
    species_id VARCHAR(50),
    name VARCHAR(100) NOT NULL,
    x FLOAT NOT NULL,
    y FLOAT NOT NULL,
    age FLOAT DEFAULT 0.0,
    energy FLOAT DEFAULT 100.0,
    hunger FLOAT DEFAULT 0.0, -- 0 is full, 100 is starving
    thirst FLOAT DEFAULT 0.0, -- 0 is quenched, 100 is parched
    generation INT DEFAULT 1,
    alive BOOLEAN DEFAULT TRUE,
    current_action VARCHAR(100) DEFAULT 'idle',
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE,
    FOREIGN KEY (species_id) REFERENCES species(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agent_memories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(50),
    type VARCHAR(50) NOT NULL, -- 'food_source', 'water_source', 'danger'
    x INT NOT NULL,
    y INT NOT NULL,
    strength FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_goals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(50),
    goal_name VARCHAR(100) NOT NULL,
    priority FLOAT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'active', 'completed'
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_actions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(50),
    action_name VARCHAR(100) NOT NULL,
    cost FLOAT NOT NULL,
    is_possible BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    agent_id VARCHAR(50),
    event_type VARCHAR(100) NOT NULL, -- 'birth', 'eat', 'drink', 'move', 'reproduce', 'die', 'reflect', 'escape'
    description TEXT,
    tick INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ecosystem_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    world_id INT,
    event_type VARCHAR(100) NOT NULL,
    description TEXT,
    tick INT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (world_id) REFERENCES worlds(id) ON DELETE CASCADE
);

-- Seed Initial Species data
INSERT INTO species (id, name, type, base_speed, base_vision, max_energy, max_hunger, max_thirst, reproduction_threshold)
VALUES 
('herbivore', 'Deer', 'herbivore', 1.0, 6, 100.0, 100.0, 100.0, 75.0),
('predator', 'Wolf', 'predator', 1.25, 8, 120.0, 100.0, 100.0, 80.0)
ON DUPLICATE KEY UPDATE name=name;
