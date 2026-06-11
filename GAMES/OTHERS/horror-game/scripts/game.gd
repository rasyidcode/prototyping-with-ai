extends Node3D

@onready var exit_key = $Map/StudyTable/ExitKey
@onready var player = $Player

var ghost_spawned: bool = false

func _ready() -> void:
	if exit_key:
		exit_key.tree_exited.connect(_on_key_picked_up)

func _on_key_picked_up() -> void:
	if ghost_spawned:
		return
	ghost_spawned = true
	
	# Spawn ghost at the end of the hallway
	var ghost_scene = preload("res://scenes/ghost.tscn")
	var ghost = ghost_scene.instantiate()
	# Position at the end of the hallway near the exit door
	ghost.global_position = Vector3(0.0, 0.1, 18.0)
	add_child(ghost)
	
	# Trigger sound and visual scare on player
	if player:
		player.play_whisper()
		player.hud.trigger_scare_flash()
