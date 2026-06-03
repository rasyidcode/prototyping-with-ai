extends Node3D

signal game_won(coins_earned: int)
signal game_lost
signal coin_updated(run_coins: int)

@onready var level_container: Node3D = $LevelContainer
@onready var player: Node3D = $Player
@onready var camera: Camera3D = $Camera3D

const LEVEL_GENERATOR = preload("res://scripts/level_generator.gd")

# Camera settings
var camera_offset: Vector3 = Vector3(0, 9.0, 11.0)
var camera_speed: float = 6.0

# Game state
var coins_earned: int = 0
var level_data: Dictionary = {}
var is_active: bool = false
var generatorNode = null

func _ready() -> void:
	generatorNode = LEVEL_GENERATOR.new()
	# Game is initialized by the Main menu controller

func setup_game() -> void:
	is_active = false
	coins_earned = 0
	coin_updated.emit(0)
	
	# Clear previous level
	for child in level_container.get_children():
		child.queue_free()
		
	# Reset Player Position
	player.global_position = Vector3(0, 0, 0)
	player.is_at_boss = false
	player.clashing_enemy_crowds.clear()
	
	# Clean player crowd and recreate starting crowd size
	for child in player.crowd_node.get_children():
		child.queue_free()
	player.crowd.clear()
	
	var start_size = int(GlobalState.get_upgrade_value("starting_crowd", GlobalState.upgrade_starting_crowd))
	player.spawn_stickmen(start_size)
	
	# Reset Camera to starting position
	camera.global_position = player.global_position + camera_offset
	camera.rotation_degrees = Vector3(-28.0, 180.0, 0.0) # Look forward/down the track
	
	# Rebuild Level
	level_data = generatorNode.generate_level(level_container, GlobalState.current_level)
	
	# Connect Castle Victory Event
	var castle = level_data.get("castle_instance")
	if castle:
		castle.boss_defeated_event.connect(_on_level_won)
		
	# Connect Player Fail Condition
	if not player.level_failed.is_connected(_on_level_failed):
		player.level_failed.connect(_on_level_failed)
	if not player.coin_collected.is_connected(_on_coin_collected):
		player.coin_collected.connect(_on_coin_collected)

func start_game() -> void:
	is_active = true
	player.start_run()

func _physics_process(delta: float) -> void:
	if not is_active:
		return
		
	# Camera following the player
	if is_instance_valid(player) and player.crowd.size() > 0:
		var target_cam_z = player.global_position.z + camera_offset.z
		# Slow follow X to absorb quick side-to-side movements
		var target_cam_x = player.global_position.x * 0.35 + camera_offset.x
		var target_cam_y = player.global_position.y + camera_offset.y
		
		var target_pos = Vector3(target_cam_x, target_cam_y, target_cam_z)
		camera.global_position = camera.global_position.lerp(target_pos, camera_speed * delta)

func _on_coin_collected(amount: int) -> void:
	coins_earned += amount
	coin_updated.emit(coins_earned)
	# Play coin collect chime

func _on_level_won() -> void:
	is_active = false
	player.stop_run()
	
	# Let player stickmen celebrate!
	for s in player.crowd:
		if is_instance_valid(s):
			s.running = false # triggers jump/celebrate bobbing
			# Apply slight jump forces/animations by tweening their scale or Y pos
			var s_tween = s.create_tween().set_loops(4)
			s_tween.tween_property(s.visuals, "position:y", 1.2, 0.25).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
			s_tween.tween_property(s.visuals, "position:y", 0.65, 0.25).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
			
	# Delay 2 seconds for visual celebration
	var timer = get_tree().create_timer(1.8)
	timer.timeout.connect(func():
		game_won.emit(coins_earned)
	)

func _on_level_failed() -> void:
	is_active = false
	player.stop_run()
	game_lost.emit()
