extends Node3D

@export var speed: float = 0.8
@export var fade_speed: float = 1.0

@onready var mesh = $CSGCylinder3D

var material: StandardMaterial3D = null
var alpha: float = 0.65
var is_fading: bool = false

func _ready() -> void:
	# Create a unique material instance to avoid affecting other ghost instances
	material = mesh.material.duplicate()
	mesh.material = material
	material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	material.albedo_color.a = alpha

func _process(delta: float) -> void:
	var player = get_tree().get_first_node_in_group("player")
	if not player:
		return
		
	# Move slowly towards the player's X/Z plane (ground level)
	var player_pos = player.global_position
	var dir = (player_pos - global_position)
	dir.y = 0.0
	var dist = dir.length()
	
	if dist > 0.1:
		dir = dir.normalized()
		global_position += dir * speed * delta
		
	# Face the player (yaw only)
	look_at(Vector3(player_pos.x, global_position.y, player_pos.z), Vector3.UP)
	rotate_y(PI) # Flip around since forward is -Z in Godot
	
	# Determine if flashlight is shining on the ghost
	if dist < 2.2:
		# Too close, start vanishing!
		is_fading = true
		
	if player.flashlight_on:
		var cam = player.camera
		var to_ghost = (global_position - cam.global_position).normalized()
		var forward = -cam.global_transform.basis.z.normalized()
		var dot = forward.dot(to_ghost)
		
		# Flashlight spot angle is 24 degrees (cos is ~0.913)
		if dot > 0.925 and dist < 12.0:
			is_fading = true
			
	if is_fading:
		alpha = move_toward(alpha, 0.0, fade_speed * delta)
		material.albedo_color.a = alpha
		if alpha <= 0.0:
			queue_free()
