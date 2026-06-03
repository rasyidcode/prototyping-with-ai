extends StaticBody3D

@export var push_step_distance := 1.0


func push_step(projectile_direction: Vector3) -> void:
	var step_direction := Vector3(projectile_direction.x, 0.0, projectile_direction.z)
	if step_direction.is_zero_approx():
		step_direction = projectile_direction

	global_position += step_direction.normalized() * push_step_distance
