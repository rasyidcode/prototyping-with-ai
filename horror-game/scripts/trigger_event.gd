extends Area3D

enum EventType { DOOR_SLAM, LIGHT_OUT, SCARY_WHISPER, SPAWN_GHOST, WIN_ZONE }
@export var event_type: EventType = EventType.SCARY_WHISPER

@export_group("Event Targets")
@export var target_door: NodePath
@export var target_lights: Array[NodePath] = []
@export var target_spawner: NodePath
@export var ghost_scene: PackedScene = preload("res://scenes/ghost.tscn")

var trigger_fired: bool = false

func _ready() -> void:
	collision_layer = 0
	collision_mask = 2 # Player is on layer 2
	body_entered.connect(_on_body_entered)

func _on_body_entered(body: Node3D) -> void:
	if trigger_fired:
		return
	if body.is_in_group("player"):
		trigger_fired = true
		_fire_event(body)

func _fire_event(player: CharacterBody3D) -> void:
	match event_type:
		EventType.DOOR_SLAM:
			var door = get_node_or_null(target_door)
			if door and door.has_method("_toggle_door"):
				if door.is_open:
					door._toggle_door()
				# Force lock it!
				door.is_locked = true
				door.key_id = "exit_key"
				door._update_prompt()
			player.hud.trigger_scare_flash()
			player.play_whisper()
			
		EventType.LIGHT_OUT:
			for path in target_lights:
				var light = get_node_or_null(path)
				if light:
					light.visible = false
			player.play_whisper()
			player.hud.trigger_scare_flash()
			
		EventType.SCARY_WHISPER:
			player.play_whisper()
			player.hud.trigger_scare_flash()
			if player.flashlight_on:
				player._flashlight_die()
				
		EventType.SPAWN_GHOST:
			if target_spawner:
				var spawner = get_node_or_null(target_spawner)
				if spawner and ghost_scene:
					var ghost = ghost_scene.instantiate()
					spawner.add_child(ghost)
					# Offset ghost slightly above floor
					ghost.position = Vector3.ZERO
			player.play_whisper()
			
		EventType.WIN_ZONE:
			player.hud.show_win_screen()
