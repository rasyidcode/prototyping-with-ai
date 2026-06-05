extends CharacterBody3D

# Movement settings
@export var walk_speed: float = 2.4
@export var crouch_speed: float = 1.2
@export var jump_velocity: float = 4.0 # Keep standard but rarely used in horror
@export var mouse_sensitivity: float = 0.002
@export var gravity_multiplier: float = 1.0

# Bobbing settings
@export var bob_freq: float = 10.0
@export var bob_amp: float = 0.05

# Flashlight settings
@export var max_battery: float = 100.0
@export var battery_drain_rate: float = 1.5 # drains in ~66s
var battery_life: float = 100.0
var flashlight_on: bool = false

# States
var is_crouching: bool = false
var inventory: Array[String] = []
var bob_t: float = 0.0
var footstep_dist: float = 0.0
var step_interval_walk: float = 1.6
var step_interval_crouch: float = 2.4

# Node references
@onready var head = $Head
@onready var camera = $Head/Camera3D
@onready var flashlight = $Head/Camera3D/Flashlight
@onready var interaction_ray = $Head/Camera3D/InteractionRayCast
@onready var collision_shape = $CollisionShape3D
@onready var sfx_player = $SFXPlayer
@onready var footstep_player = $FootstepPlayer
@onready var ambient_player = $AmbientPlayer
@onready var hud = $HUD

# Sound files
@onready var click_sfx = preload("res://sounds/flashlight_click.wav")
@onready var footstep_sfx = preload("res://sounds/footstep.wav")
@onready var whisper_sfx = preload("res://sounds/scary_whisper.wav")
@onready var key_sfx = preload("res://sounds/key_pickup.wav")
@onready var ambient_drone = preload("res://sounds/ambient_drone.wav")

func _init() -> void:
	# Register inputs programmatically if not already defined in project settings
	_register_action("move_forward", KEY_W)
	_register_action_extra("move_forward", KEY_UP)
	
	_register_action("move_backward", KEY_S)
	_register_action_extra("move_backward", KEY_DOWN)
	
	_register_action("move_left", KEY_A)
	_register_action_extra("move_left", KEY_LEFT)
	
	_register_action("move_right", KEY_D)
	_register_action_extra("move_right", KEY_RIGHT)
	
	_register_action("interact", KEY_E)
	
	_register_action("flashlight", KEY_F)
	_register_action_mouse("flashlight", MOUSE_BUTTON_LEFT)
	
	_register_action("crouch", KEY_CTRL)
	_register_action_extra("crouch", KEY_C)
	
	_register_action("ui_cancel", KEY_ESCAPE)

func _register_action(action_name: String, keycode: Key) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
		var event = InputEventKey.new()
		event.physical_keycode = keycode
		InputMap.action_add_event(action_name, event)

func _register_action_extra(action_name: String, keycode: Key) -> void:
	if InputMap.has_action(action_name):
		var event = InputEventKey.new()
		event.physical_keycode = keycode
		# Check if already added
		var already_exists = false
		for ev in InputMap.action_get_events(action_name):
			if ev is InputEventKey and ev.physical_keycode == keycode:
				already_exists = true
				break
		if not already_exists:
			InputMap.action_add_event(action_name, event)

func _register_action_mouse(action_name: String, button_index: MouseButton) -> void:
	if InputMap.has_action(action_name):
		var event = InputEventMouseButton.new()
		event.button_index = button_index
		var already_exists = false
		for ev in InputMap.action_get_events(action_name):
			if ev is InputEventMouseButton and ev.button_index == button_index:
				already_exists = true
				break
		if not already_exists:
			InputMap.action_add_event(action_name, event)

func _ready() -> void:
	add_to_group("player")
	# Capture mouse
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	
	# Start ambient drone
	ambient_player.stream = ambient_drone
	ambient_player.autoplay = true
	ambient_player.play()
	
	# Initialize HUD battery status
	hud.update_battery(battery_life)

func _unhandled_input(event: InputEvent) -> void:
	if get_tree().paused or hud.is_note_open:
		return
		
	# Mouse look
	if event is InputEventMouseMotion:
		rotate_y(-event.relative.x * mouse_sensitivity)
		head.rotate_x(-event.relative.y * mouse_sensitivity)
		# Clamp vertical looking
		head.rotation.x = clamp(head.rotation.x, deg_to_rad(-80), deg_to_rad(85))

func _physics_process(delta: float) -> void:
	# Handle Pause (ESC)
	if Input.is_action_just_pressed("ui_cancel"):
		# If note is open, close it
		if hud.is_note_open:
			hud.close_note()
		else:
			# Toggle mouse mode
			if Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
				Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
			else:
				Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
				
	if get_tree().paused:
		return

	# Add gravity
	if not is_on_floor():
		velocity += get_gravity() * gravity_multiplier * delta

	# Handle Crouch toggle or hold
	if Input.is_action_pressed("crouch"):
		is_crouching = true
	else:
		is_crouching = false
		
	# Smooth crouching height collision and head placement
	var target_height = 1.2 if is_crouching else 2.0
	var target_head_y = 1.0 if is_crouching else 1.7
	
	# Lerp collision capsule height and position
	collision_shape.shape.height = lerp(collision_shape.shape.height, target_height, delta * 8.0)
	collision_shape.position.y = collision_shape.shape.height / 2.0
	head.position.y = lerp(head.position.y, target_head_y, delta * 8.0)

	# Movement direction
	var input_dir = Input.get_vector("move_left", "move_right", "move_forward", "move_backward")
	var direction = (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
	
	var current_speed = crouch_speed if is_crouching else walk_speed
	
	if direction:
		velocity.x = direction.x * current_speed
		velocity.z = direction.z * current_speed
	else:
		velocity.x = move_toward(velocity.x, 0, current_speed)
		velocity.z = move_toward(velocity.z, 0, current_speed)

	move_and_slide()
	
	# Head Bobbing
	var horizontal_speed = Vector3(velocity.x, 0, velocity.z).length()
	if is_on_floor() and horizontal_speed > 0.1:
		bob_t += delta * horizontal_speed * (2.0 if is_crouching else 1.0)
		var bob_offset_y = sin(bob_t * bob_freq) * bob_amp
		var bob_offset_x = cos(bob_t * bob_freq * 0.5) * bob_amp * 0.5
		camera.transform.origin = Vector3(bob_offset_x, bob_offset_y, 0)
		
		# Footsteps logic
		footstep_dist += horizontal_speed * delta
		var limit = step_interval_crouch if is_crouching else step_interval_walk
		if footstep_dist >= limit:
			footstep_dist = 0.0
			_play_footstep()
	else:
		bob_t = 0.0
		camera.transform.origin = camera.transform.origin.lerp(Vector3.ZERO, delta * 8.0)

	# Handle flashlight toggle
	if Input.is_action_just_pressed("flashlight"):
		_toggle_flashlight()
		
	# Manage battery drain
	if flashlight_on:
		battery_life = max(0.0, battery_life - battery_drain_rate * delta)
		hud.update_battery(battery_life)
		if battery_life <= 0.0:
			_flashlight_die()

	# Interaction Raycast check
	_handle_interaction()

func _play_footstep() -> void:
	footstep_player.stream = footstep_sfx
	# Add slight pitch randomization for natural feel
	footstep_player.pitch_scale = randf_range(0.85, 1.15)
	# Muffle volume when crouching
	footstep_player.volume_db = -12.0 if is_crouching else -4.0
	footstep_player.play()

func _toggle_flashlight() -> void:
	if battery_life <= 0.0:
		return
	flashlight_on = not flashlight_on
	flashlight.visible = flashlight_on
	sfx_player.stream = click_sfx
	sfx_player.pitch_scale = randf_range(0.9, 1.1)
	sfx_player.volume_db = -2.0
	sfx_player.play()

func _flashlight_die() -> void:
	flashlight_on = false
	# Flicker out effect
	var tween = create_tween()
	tween.tween_callback(func(): flashlight.visible = false)
	tween.tween_interval(0.1)
	tween.tween_callback(func(): flashlight.visible = true)
	tween.tween_interval(0.05)
	tween.tween_callback(func(): flashlight.visible = false)
	tween.tween_interval(0.1)
	tween.tween_callback(func(): flashlight.visible = true)
	tween.tween_interval(0.05)
	tween.tween_callback(func(): flashlight.visible = false)

func add_battery(amount: float) -> void:
	battery_life = min(max_battery, battery_life + amount)
	hud.update_battery(battery_life)

func collect_key(key_id: String) -> void:
	inventory.append(key_id)
	sfx_player.stream = key_sfx
	sfx_player.pitch_scale = 1.0
	sfx_player.volume_db = -4.0
	sfx_player.play()

func has_key(key_id: String) -> bool:
	return inventory.has(key_id)

func _handle_interaction() -> void:
	if hud.is_note_open:
		# If note is open, check if E is pressed to close it
		if Input.is_action_just_pressed("interact"):
			hud.close_note()
		return

	if interaction_ray.is_colliding():
		var collider = interaction_ray.get_collider()
		if collider is Interactable:
			hud.show_interaction_prompt(collider.prompt_message)
			if Input.is_action_just_pressed("interact"):
				collider.interact(self)
		else:
			hud.hide_interaction_prompt()
	else:
		hud.hide_interaction_prompt()

func play_whisper() -> void:
	sfx_player.stream = whisper_sfx
	sfx_player.pitch_scale = 0.9
	sfx_player.volume_db = 0.0
	sfx_player.play()
