extends Area3D

@export var lifetime := 3.0

var _direction := Vector3.FORWARD
var _speed := 24.0
var _has_hit := false


func setup(direction: Vector3, speed: float) -> void:
	_direction = direction.normalized()
	_speed = speed
	look_at(global_position + _direction, Vector3.UP)


func _ready() -> void:
	body_entered.connect(_on_body_entered)


func _physics_process(delta: float) -> void:
	if _has_hit:
		return

	lifetime -= delta
	if lifetime <= 0.0:
		queue_free()
		return

	var next_position := global_position + _direction * _speed * delta
	var query := PhysicsRayQueryParameters3D.create(global_position, next_position)
	query.collide_with_areas = false
	query.collide_with_bodies = true
	query.exclude = [get_rid()]

	var hit := get_world_3d().direct_space_state.intersect_ray(query)
	if hit:
		global_position = hit.position
		_hit_body(hit.collider)
		return

	global_position = next_position


func _on_body_entered(body: Node3D) -> void:
	_hit_body(body)


func _hit_body(body: Node3D) -> void:
	if _has_hit:
		return

	_has_hit = true
	if body.has_method("push_step"):
		body.push_step(_direction)

	queue_free()
