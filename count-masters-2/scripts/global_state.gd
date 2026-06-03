extends Node

const SAVE_PATH = "user://save_game.cfg"

# Game State
var coins: int = 100
var current_level: int = 1

# Upgrade levels (1-based)
var upgrade_starting_crowd: int = 1
var upgrade_gate_bonus: int = 1
var upgrade_coin_multiplier: int = 1

# Upgrade costs and values
func get_upgrade_cost(type: String, level: int) -> int:
	match type:
		"starting_crowd":
			return int(15 * pow(1.5, level - 1))
		"gate_bonus":
			return int(20 * pow(1.6, level - 1))
		"coin_multiplier":
			return int(25 * pow(1.7, level - 1))
	return 9999

func get_upgrade_value(type: String, level: int) -> float:
	match type:
		"starting_crowd":
			# Starting stickmen: Level 1 = 1, Level 2 = 3, Level 3 = 5, etc.
			return float(1 + (level - 1) * 2)
		"gate_bonus":
			# Flat bonus added to positive gates: Level 1 = 0, Level 2 = 1, Level 3 = 2, etc.
			return float(level - 1)
		"coin_multiplier":
			# Coin earning multiplier: Level 1 = 1.0, Level 2 = 1.2, Level 3 = 1.4, etc.
			return 1.0 + (level - 1) * 0.2
	return 0.0

func _ready() -> void:
	load_game()

func save_game() -> void:
	var config = ConfigFile.new()
	config.set_value("progression", "coins", coins)
	config.set_value("progression", "current_level", current_level)
	config.set_value("upgrades", "starting_crowd", upgrade_starting_crowd)
	config.set_value("upgrades", "gate_bonus", upgrade_gate_bonus)
	config.set_value("upgrades", "coin_multiplier", upgrade_coin_multiplier)
	config.save(SAVE_PATH)

func load_game() -> void:
	var config = ConfigFile.new()
	var err = config.load(SAVE_PATH)
	if err == OK:
		coins = config.get_value("progression", "coins", 100)
		current_level = config.get_value("progression", "current_level", 1)
		upgrade_starting_crowd = config.get_value("upgrades", "starting_crowd", 1)
		upgrade_gate_bonus = config.get_value("upgrades", "gate_bonus", 1)
		upgrade_coin_multiplier = config.get_value("upgrades", "coin_multiplier", 1)
	else:
		# First time running, save default values
		save_game()

func add_coins(amount: int) -> void:
	var multiplied_amount = int(amount * get_upgrade_value("coin_multiplier", upgrade_coin_multiplier))
	coins += multiplied_amount
	save_game()

func purchase_upgrade(type: String) -> bool:
	var current_lvl = 1
	match type:
		"starting_crowd": current_lvl = upgrade_starting_crowd
		"gate_bonus": current_lvl = upgrade_gate_bonus
		"coin_multiplier": current_lvl = upgrade_coin_multiplier
		
	var cost = get_upgrade_cost(type, current_lvl)
	if coins >= cost:
		coins -= cost
		match type:
			"starting_crowd": upgrade_starting_crowd += 1
			"gate_bonus": upgrade_gate_bonus += 1
			"coin_multiplier": upgrade_coin_multiplier += 1
		save_game()
		return true
	return false
