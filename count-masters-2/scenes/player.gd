extends Node3D

signal crowd_count_changed(count: int)
signal coin_collected(amount: int)
signal level_completed
signal level_failed

@onready var crowd_node: Node3D = $Crowd
@onready var collision_area: Area3D = $LeaderArea
@onready var count_label: Label3D = $CountLabel

const STICKMAN_SCENE = preload("res://scenes/stickman.tscn")

# Movement
@export var forward_speed: float = 12.0
@export var track_width: float = 9.0 # From -4.5 to 4.5
var current_forward_speed: float = 12.0
var active: bool = false

# Dragging
var is_dragging: bool = false
var last_mouse_x: float = 0.0
var drag_sensitivity: float = 1.8

# Crowd
var crowd: Array[Area3D] = []
var spacing: float = 0.25

# Clashing / Fight state
var clashing_enemy_crowds: Array[Node3D] = []
var is_at_boss: bool = false

func _ready() -> void:
	current_forward_speed = forward_speed
	
	# Connect signal to update crowd count label
	crowd_count_changed.connect(func(count):
		if count_label:
			count_label.text = str(count)
			# Animate label scale slightly on change for visual feedback
			var tween = create_tween()
			count_label.scale = Vector3(1.2, 1.2, 1.2)
			tween.tween_property(count_label, "scale", Vector3.ONE, 0.15)
	)
	
	# Spawn starting crowd based on upgrades
	var start_size = int(GlobalState.get_upgrade_value("starting_crowd", GlobalState.upgrade_starting_crowd))
	spawn_stickmen(start_size)
	
	# Connect Area3D signals
	collision_area.area_entered.connect(_on_leader_area_entered)

func start_run() -> void:
	active = true

func stop_run() -> void:
	active = false

func _unhandled_input(event: InputEvent) -> void:
	if not active or is_at_boss:
		return
		
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			is_dragging = event.pressed
			last_mouse_x = event.position.x
			
	elif event is InputEventMouseMotion and is_dragging:
		var dx = event.position.x - last_mouse_x
		last_mouse_x = event.position.x
		
		# Resolution independent drag
		var screen_width = get_viewport().get_visible_rect().size.x
		if screen_width > 0:
			var world_dx = (dx / screen_width) * track_width * drag_sensitivity
			position.x = clamp(position.x + world_dx, -track_width / 2.0, track_width / 2.0)

func _physics_process(delta: float) -> void:
	if not active:
		return
		
	# Check clashing status
	# Clean up any freed enemy crowds from our reference list
	clashing_enemy_crowds = clashing_enemy_crowds.filter(func(node): return is_instance_valid(node) and node.get_enemy_count() > 0)
	
	# Adjust forward movement speed
	if is_at_boss:
		current_forward_speed = 0.0
	elif clashing_enemy_crowds.size() > 0:
		# Slow down dramatically when fighting an enemy crowd to show clashing impact
		current_forward_speed = forward_speed * 0.15
	else:
		current_forward_speed = forward_speed
		
	# Move forward (negative Z is forward)
	global_position.z -= current_forward_speed * delta
	
	# Update stickman target offsets
	update_crowd_positions(delta)
	
	# Fail condition
	if crowd.size() == 0:
		active = false
		level_failed.emit()

func update_crowd_positions(delta: float) -> void:
	# Keep crowd array clean from deleted elements
	crowd = crowd.filter(func(s): return is_instance_valid(s))
	
	# Apply Vogel Spiral algorithm to distribute stickmen
	for i in range(crowd.size()):
		var stickman = crowd[i]
		if not is_instance_valid(stickman):
			continue
			
		# Vogel Spiral Formula
		var theta = i * 2.39996 # Golden Angle in radians
		var r = spacing * sqrt(i + 1)
		
		var offset_x = cos(theta) * r
		var offset_z = sin(theta) * r
		
		# Offset position relative to player leader (this node)
		var target_pos = global_position + Vector3(offset_x, 0, offset_z)
		
		# Clamp X so stickmen do not run off the track
		target_pos.x = clamp(target_pos.x, -track_width / 2.0, track_width / 2.0)
		# Keep Z slightly behind the leader
		target_pos.z = min(target_pos.z, global_position.z)
		
		stickman.target_position = target_pos

func spawn_stickmen(amount: int) -> void:
	for i in range(amount):
		var stickman = STICKMAN_SCENE.instantiate()
		stickman.is_enemy = false
		
		# Spawn at leader's position with slight offset so they don't spawn in a single point
		stickman.global_position = global_position + Vector3(randf_range(-0.5, 0.5), 0, randf_range(-0.2, 0.2))
		
		crowd_node.add_child(stickman)
		crowd.append(stickman)
		
		# Connect to stickman destruction to remove it from our list
		stickman.tree_exiting.connect(func():
			# Trigger check next frame or immediately
			call_deferred("_cleanup_and_emit_count")
		)
		
	crowd_count_changed.emit(crowd.size())

func _cleanup_and_emit_count() -> void:
	crowd = crowd.filter(func(s): return is_instance_valid(s))
	crowd_count_changed.emit(crowd.size())

func remove_random_stickmen(amount: int) -> void:
	crowd = crowd.filter(func(s): return is_instance_valid(s))
	var to_remove = min(amount, crowd.size())
	for i in range(to_remove):
		var s = crowd.pop_back()
		if is_instance_valid(s):
			s.die()
	crowd_count_changed.emit(crowd.size())

func multiply_crowd(multiplier: float) -> void:
	crowd = crowd.filter(func(s): return is_instance_valid(s))
	var current_count = crowd.size()
	var new_count = int(current_count * multiplier)
	var difference = new_count - current_count
	
	if difference > 0:
		spawn_stickmen(difference)
	elif difference < 0:
		remove_random_stickmen(abs(difference))

func _on_leader_area_entered(area: Area3D) -> void:
	# Coin collection
	if area.is_in_group("coin"):
		area.queue_free()
		coin_collected.emit(1)
		# Spawn small floating coin effect or text
		
	# Math Gates logic (handled by gates themselves or player)
	# Boss trigger
	elif area.is_in_group("boss_trigger"):
		is_at_boss = true
		for s in crowd:
			if is_instance_valid(s):
				s.running = false # Stop running, prepare to charge!
		
		# Start boss encounter fight (handled by main scene / game script)
