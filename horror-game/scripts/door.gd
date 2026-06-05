extends Interactable

@export var is_locked: bool = false
@export var key_id: String = ""
@export var open_angle: float = 90.0 # in degrees
@export var open_speed: float = 1.0 # factor of speed

@onready var hinge = $Hinge
@onready var audio_player = $AudioPlayer3D

# Preload sounds
@onready var creak_sfx = preload("res://sounds/door_creak.wav")
@onready var slam_sfx = preload("res://sounds/door_slam.wav")
@onready var lock_rattle_sfx = preload("res://sounds/flashlight_click.wav")

var is_open: bool = false
var is_animating: bool = false

func _ready() -> void:
	_update_prompt()

func _update_prompt() -> void:
	if is_locked:
		prompt_message = "[E] Open Locked Door"
	elif is_open:
		prompt_message = "[E] Close Door"
	else:
		prompt_message = "[E] Open Door"

func interact(player: CharacterBody3D) -> void:
	if is_animating:
		return
		
	if is_locked:
		if player.has_key(key_id):
			# Unlock!
			is_locked = false
			_update_prompt()
			player.hud.show_interaction_prompt("[E] Open Door")
			# Play unlock chime on player
			player.sfx_player.stream = player.key_sfx
			player.sfx_player.pitch_scale = 1.25
			player.sfx_player.volume_db = -4.0
			player.sfx_player.play()
			
			# Auto open
			_toggle_door()
		else:
			# Locked prompt feedback
			prompt_message = "Locked. Needs Key."
			player.hud.show_interaction_prompt(prompt_message)
			
			# Play rattle click
			audio_player.stream = lock_rattle_sfx
			audio_player.pitch_scale = 0.55
			audio_player.volume_db = 0.0
			audio_player.play()
			
			# Visual shake feedback on the hinge
			var tween = create_tween()
			var orig_y = hinge.rotation.y
			tween.tween_property(hinge, "rotation:y", orig_y + deg_to_rad(2.5), 0.05)
			tween.tween_property(hinge, "rotation:y", orig_y - deg_to_rad(2.5), 0.05)
			tween.tween_property(hinge, "rotation:y", orig_y + deg_to_rad(1.5), 0.05)
			tween.tween_property(hinge, "rotation:y", orig_y, 0.05)
			
			# Reset prompt message after a delay
			await get_tree().create_timer(1.2).timeout
			_update_prompt()
	else:
		_toggle_door()

func _toggle_door() -> void:
	is_animating = true
	is_open = not is_open
	_update_prompt()
	
	var target_angle = deg_to_rad(open_angle) if is_open else 0.0
	var duration = 1.2 / open_speed
	
	# Play door creak
	audio_player.stream = creak_sfx
	audio_player.pitch_scale = randf_range(0.95, 1.05)
	audio_player.volume_db = -3.0
	audio_player.play()
	
	var tween = create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_QUAD)
	tween.tween_property(hinge, "rotation:y", target_angle, duration)
	
	await tween.finished
	is_animating = false
	
	# If closing, play slam sound
	if not is_open:
		audio_player.stream = slam_sfx
		audio_player.pitch_scale = randf_range(0.92, 1.08)
		audio_player.volume_db = -3.0
		audio_player.play()
