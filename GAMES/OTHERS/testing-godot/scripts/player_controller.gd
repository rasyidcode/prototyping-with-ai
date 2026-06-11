extends CharacterBody3D

@export var walk_speed := 5.0
@export var sprint_multiplier := 1.6
@export var acceleration := 18.0
@export var air_acceleration := 6.0
@export var jump_velocity := 4.5
@export var mouse_sensitivity := 0.0025
@export_range(1.0, 89.0, 1.0, "degrees") var max_look_angle := 85.0
@export var projectile_scene: PackedScene = preload("res://scenes/Projectile.tscn")
@export var projectile_speed := 24.0
@export var fire_cooldown := 0.2

@onready var camera: Camera3D = $Camera3D
@onready var muzzle: Marker3D = $Camera3D/Gun/Muzzle

var _pitch := 0.0
var _fire_cooldown_remaining := 0.0


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		return

	if event is InputEventMouseButton and event.pressed:
		if Input.mouse_mode != Input.MOUSE_MODE_CAPTURED:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
			return
		if event.is_action_pressed("fire"):
			_fire_projectile()
			return

	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		rotate_y(-event.relative.x * mouse_sensitivity)
		_pitch = clamp(
			_pitch - event.relative.y * mouse_sensitivity,
			deg_to_rad(-max_look_angle),
			deg_to_rad(max_look_angle)
		)
		camera.rotation.x = _pitch


func _physics_process(delta: float) -> void:
	_fire_cooldown_remaining = maxf(_fire_cooldown_remaining - delta, 0.0)

	var input_vector := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var direction := (transform.basis * Vector3(input_vector.x, 0.0, input_vector.y)).normalized()
	var target_speed := walk_speed

	if Input.is_action_pressed("sprint"):
		target_speed *= sprint_multiplier

	var target_velocity := direction * target_speed
	var current_acceleration := acceleration if is_on_floor() else air_acceleration

	velocity.x = move_toward(velocity.x, target_velocity.x, current_acceleration * delta)
	velocity.z = move_toward(velocity.z, target_velocity.z, current_acceleration * delta)

	if is_on_floor():
		if velocity.y < 0.0:
			velocity.y = 0.0
		if Input.is_action_just_pressed("jump"):
			velocity.y = jump_velocity
	else:
		velocity += get_gravity() * delta

	move_and_slide()


func _fire_projectile() -> void:
	if _fire_cooldown_remaining > 0.0 or projectile_scene == null:
		return

	var projectile := projectile_scene.instantiate()
	get_tree().current_scene.add_child(projectile)
	projectile.global_transform = muzzle.global_transform

	var fire_direction := -camera.global_transform.basis.z.normalized()
	if projectile.has_method("setup"):
		projectile.setup(fire_direction, projectile_speed)

	_fire_cooldown_remaining = fire_cooldown
