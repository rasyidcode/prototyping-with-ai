extends Node

@onready var game: Node3D = $Game
@onready var ui: CanvasLayer = $UI

# Screens
@onready var menu_screen: Control = $UI/MainMenu
@onready var hud_screen: Control = $UI/HUD
@onready var victory_screen: Control = $UI/Victory
@onready var defeat_screen: Control = $UI/Defeat

# Menu elements
@onready var coin_label: Label = $UI/MainMenu/VBox/CoinContainer/CoinLabel
@onready var level_label: Label = $UI/MainMenu/VBox/LevelLabel
@onready var upgrade_crowd_btn: Button = $UI/MainMenu/VBox/Upgrades/CrowdUpgrade/Button
@onready var upgrade_gate_btn: Button = $UI/MainMenu/VBox/Upgrades/GateUpgrade/Button
@onready var upgrade_mult_btn: Button = $UI/MainMenu/VBox/Upgrades/MultUpgrade/Button

# HUD elements
@onready var hud_coins: Label = $UI/HUD/CoinsLabel
@onready var hud_level: Label = $UI/HUD/LevelLabel

# Result elements
@onready var vic_earned: Label = $UI/Victory/Panel/VBox/EarnedLabel
@onready var vic_claim_btn: Button = $UI/Victory/Panel/VBox/ClaimButton
@onready var def_retry_btn: Button = $UI/Defeat/Panel/VBox/RetryButton

var pending_coins: int = 0

func _ready() -> void:
	# Hide gameplay screens, show menu
	menu_screen.visible = true
	hud_screen.visible = false
	victory_screen.visible = false
	defeat_screen.visible = false
	
	# Connect Game signals
	game.game_won.connect(_on_game_won)
	game.game_lost.connect(_on_game_lost)
	game.coin_updated.connect(_on_hud_coin_updated)
	
	# Connect Upgrade buttons
	upgrade_crowd_btn.pressed.connect(func(): _on_upgrade_pressed("starting_crowd"))
	upgrade_gate_btn.pressed.connect(func(): _on_upgrade_pressed("gate_bonus"))
	upgrade_mult_btn.pressed.connect(func(): _on_upgrade_pressed("coin_multiplier"))
	
	# Connect Play and Result buttons
	$UI/MainMenu/PlayButton.pressed.connect(start_run)
	vic_claim_btn.pressed.connect(_on_claim_pressed)
	def_retry_btn.pressed.connect(_on_retry_pressed)
	
	# Setup initial game track so it renders in the menu background
	game.setup_game()
	refresh_menu_ui()

func refresh_menu_ui() -> void:
	coin_label.text = str(GlobalState.coins)
	level_label.text = "LEVEL " + str(GlobalState.current_level)
	
	# Upgrade Starting Crowd
	var crowd_lvl = GlobalState.upgrade_starting_crowd
	var crowd_cost = GlobalState.get_upgrade_cost("starting_crowd", crowd_lvl)
	var crowd_val = GlobalState.get_upgrade_value("starting_crowd", crowd_lvl)
	var crowd_lbl_node = $UI/MainMenu/VBox/Upgrades/CrowdUpgrade/VBox/DescLabel
	crowd_lbl_node.text = "Start Crowd: " + str(crowd_val) + "\nLevel " + str(crowd_lvl)
	upgrade_crowd_btn.text = str(crowd_cost) + " COINS"
	upgrade_crowd_btn.disabled = (GlobalState.coins < crowd_cost)
	
	# Upgrade Gate Bonus
	var gate_lvl = GlobalState.upgrade_gate_bonus
	var gate_cost = GlobalState.get_upgrade_cost("gate_bonus", gate_lvl)
	var gate_val = GlobalState.get_upgrade_value("gate_bonus", gate_lvl)
	var gate_lbl_node = $UI/MainMenu/VBox/Upgrades/GateUpgrade/VBox/DescLabel
	gate_lbl_node.text = "Gate Bonus: +" + str(gate_val) + "\nLevel " + str(gate_lvl)
	upgrade_gate_btn.text = str(gate_cost) + " COINS"
	upgrade_gate_btn.disabled = (GlobalState.coins < gate_cost)
	
	# Upgrade Coin Multiplier
	var mult_lvl = GlobalState.upgrade_coin_multiplier
	var mult_cost = GlobalState.get_upgrade_cost("coin_multiplier", mult_lvl)
	var mult_val = GlobalState.get_upgrade_value("coin_multiplier", mult_lvl)
	var mult_lbl_node = $UI/MainMenu/VBox/Upgrades/MultUpgrade/VBox/DescLabel
	mult_lbl_node.text = "Coin Mult: x" + str(mult_val) + "\nLevel " + str(mult_lvl)
	upgrade_mult_btn.text = str(mult_cost) + " COINS"
	upgrade_mult_btn.disabled = (GlobalState.coins < mult_cost)

func _on_upgrade_pressed(type: String) -> void:
	if GlobalState.purchase_upgrade(type):
		# Re-setup game to reflect crowd size upgrades in the background
		game.setup_game()
		refresh_menu_ui()
		# Add a nice punch tween to coin label
		var tween = create_tween()
		coin_label.scale = Vector2(1.3, 1.3)
		tween.tween_property(coin_label, "scale", Vector2.ONE, 0.2)

func start_run() -> void:
	menu_screen.visible = false
	hud_screen.visible = true
	
	hud_level.text = "LEVEL " + str(GlobalState.current_level)
	
	# Fade in instructions overlay
	var instr = $UI/HUD/Instructions
	instr.visible = true
	instr.modulate.a = 1.0
	var tween = create_tween()
	tween.tween_property(instr, "modulate:a", 0.0, 2.0).set_delay(1.5)
	tween.finished.connect(func(): instr.visible = false)
	
	game.start_game()

func _on_hud_coin_updated(run_coins: int) -> void:
	hud_coins.text = "COINS: +" + str(run_coins)

func _on_game_won(coins_earned: int) -> void:
	pending_coins = coins_earned
	hud_screen.visible = false
	victory_screen.visible = true
	
	var mult = GlobalState.get_upgrade_value("coin_multiplier", GlobalState.upgrade_coin_multiplier)
	var base_str = "Coins Gathered: " + str(coins_earned)
	if mult > 1.05:
		base_str += "\nMultiplier (x" + str(mult) + "): +" + str(int(coins_earned * mult) - coins_earned)
	base_str += "\n\nTotal Gained: +" + str(int(coins_earned * mult))
	vic_earned.text = base_str
	
	# Pulse claim button
	var btn_tween = create_tween().set_loops()
	btn_tween.tween_property(vic_claim_btn, "scale", Vector2(1.05, 1.05), 0.5)
	btn_tween.tween_property(vic_claim_btn, "scale", Vector2.ONE, 0.5)

func _on_game_lost() -> void:
	hud_screen.visible = false
	defeat_screen.visible = true
	
	# Set motivational hint
	var hint_lbl = $UI/Defeat/Panel/VBox/HintLabel
	var hints = [
		"Tip: Avoid red gates and steer away from spinning blades!",
		"Tip: Upgrade your Starting Crowd early to survive heavy clashing!",
		"Tip: Keep your eyes open for math gates that multiply your count!",
		"Tip: Don't charge into large red crowds blindly!"
	]
	hint_lbl.text = hints[randi() % hints.size()]

func _on_claim_pressed() -> void:
	# Stop scale tween on button
	create_tween().tween_property(vic_claim_btn, "scale", Vector2.ONE, 0.05)
	
	# Add coins to state
	GlobalState.add_coins(pending_coins)
	# Advance level
	GlobalState.current_level += 1
	GlobalState.save_game()
	
	victory_screen.visible = false
	menu_screen.visible = true
	
	# Regenerate menu background track
	game.setup_game()
	refresh_menu_ui()

func _on_retry_pressed() -> void:
	defeat_screen.visible = false
	hud_screen.visible = true
	
	hud_coins.text = "COINS: +0"
	
	game.setup_game()
	game.start_game()
