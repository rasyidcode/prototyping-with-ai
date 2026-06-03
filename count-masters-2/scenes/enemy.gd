extends Area3D

@export var enemy_count: int = 12
@export var charge_speed: float = 6.0

@onready var crowd_node: Node3D = $Crowd
const STICKMAN_SCENE = preload("res://scenes/stickman.tscn")

var enemies: Array[Area3D] = []
var player_node: Node3D = null
var charging: bool = false
var spacing: float = 0.25

func _ready() -> void:
	# Connect detection area
	area_entered.connect(_on_area_entered)
	
	# Spawn enemy crowd
	call_deferred("spawn_enemies")

func spawn_enemies() -> void:
	for i in range(enemy_count):
		var stickman = STICKMAN_SCENE.instantiate()
		stickman.is_enemy = true
		
		# Position in Vogel spiral relative to enemy crowd center
		var theta = i * 2.39996
		var r = spacing * sqrt(i + 1)
		var offset = Vector3(cos(theta) * r, 0, sin(theta) * r)
		
		stickman.global_position = global_position + offset
		# Rotate to face player (looking back in positive Z direction)
		stickman.rotation.y = PI
		
		crowd_node.add_child(stickman)
		enemies.append(stickman)
		
		# Connect tree exiting signal to clean up array
		stickman.tree_exiting.connect(func():
			call_deferred("_cleanup_enemies")
		)
		
	update_enemy_positions(0.0)

func _cleanup_enemies() -> void:
	enemies = enemies.filter(func(e): return is_instance_valid(e))
	if enemies.size() == 0:
		# Enemy crowd defeated! Delete this node
		queue_free()

func get_enemy_count() -> int:
	enemies = enemies.filter(func(e): return is_instance_valid(e))
	return enemies.size()

func _physics_process(delta: float) -> void:
	if not charging or not is_instance_valid(player_node):
		return
		
	enemies = enemies.filter(func(e): return is_instance_valid(e))
	if enemies.size() == 0:
		return
		
	# Move each enemy stickman towards the player leader
	var target_pos = player_node.global_position
	for s in enemies:
		if is_instance_valid(s):
			# Run directly towards player
			var dir = (target_pos - s.global_position).normalized()
			# Move their target position forward
			s.target_position = s.global_position + dir * charge_speed * delta

func update_enemy_positions(delta: float) -> void:
	for i in range(enemies.size()):
		var s = enemies[i]
		if is_instance_valid(s):
			var theta = i * 2.39996
			var r = spacing * sqrt(i + 1)
			s.target_position = global_position + Vector3(cos(theta) * r, 0, sin(theta) * r)

func _on_area_entered(area: Area3D) -> void:
	if charging:
		return
		
	# Find player leader area
	var node = area
	while node != null:
		if node.is_in_group("player"):
			player_node = node
			charging = true
			
			# Register with player for clash slowing
			if player_node.has_method("start_run"):
				if not player_node.clashing_enemy_crowds.has(self):
					player_node.clashing_enemy_crowds.append(self)
			break
		node = node.get_parent()
