extends Area3D

@onready var body_mesh: MeshInstance3D = $Visuals/Body
@onready var head_mesh: MeshInstance3D = $Visuals/Head
@onready var leg_l: Node3D = $Visuals/LegLeft
@onready var leg_r: Node3D = $Visuals/LegRight
@onready var visuals: Node3D = $Visuals

var is_enemy: bool = false
var target_position: Vector3 = Vector3.ZERO
var lerp_speed: float = 12.0
var running: bool = true
var time_offset: float = 0.0

# Materials
var player_mat: StandardMaterial3D
var enemy_mat: StandardMaterial3D
var eye_mat: StandardMaterial3D

func _ready() -> void:
	time_offset = randf() * 10.0
	setup_materials()
	apply_theme()
	
	# Connect overlap signal for clashing
	area_entered.connect(_on_area_entered)

func setup_materials() -> void:
	player_mat = StandardMaterial3D.new()
	player_mat.albedo_color = Color(0.0, 0.6, 1.0) # Vibrant cyan/blue
	player_mat.roughness = 0.3
	player_mat.metallic = 0.1
	
	enemy_mat = StandardMaterial3D.new()
	enemy_mat.albedo_color = Color(1.0, 0.15, 0.15) # Vibrant red
	enemy_mat.roughness = 0.3
	enemy_mat.metallic = 0.1
	
	eye_mat = StandardMaterial3D.new()
	eye_mat.albedo_color = Color(1.0, 1.0, 1.0)
	eye_mat.emission_enabled = true
	eye_mat.emission = Color(1.0, 1.0, 1.0)
	eye_mat.emission_energy_multiplier = 1.5

func apply_theme() -> void:
	var active_mat = enemy_mat if is_enemy else player_mat
	
	if is_enemy:
		collision_layer = 4  # Layer 3 (Enemies)
		collision_mask = 2   # Layer 2 (Player)
	else:
		collision_layer = 2  # Layer 2 (Player)
		collision_mask = 28  # Layer 3 (Enemies) + Layer 4 (Gates) + Layer 5 (Obstacles)
		
	if body_mesh:
		body_mesh.set_surface_override_material(0, active_mat)
	if head_mesh:
		head_mesh.set_surface_override_material(0, active_mat)
	if leg_l:
		var mesh = leg_l.get_node_or_null("Mesh")
		if mesh: mesh.set_surface_override_material(0, active_mat)
	if leg_r:
		var mesh = leg_r.get_node_or_null("Mesh")
		if mesh: mesh.set_surface_override_material(0, active_mat)
		
	# Apply eye material
	var eye_l = get_node_or_null("Visuals/EyeLeft")
	var eye_r = get_node_or_null("Visuals/EyeRight")
	if eye_l: eye_l.set_surface_override_material(0, eye_mat)
	if eye_r: eye_r.set_surface_override_material(0, eye_mat)

func _physics_process(delta: float) -> void:
	# Smoothly interpolate position towards target_position on floor
	var current_pos = global_position
	# Lerp horizontally (X) and vertically (Z) quickly
	current_pos.x = lerp(current_pos.x, target_position.x, lerp_speed * delta)
	current_pos.z = lerp(current_pos.z, target_position.z, lerp_speed * delta)
	# Stick to ground (Y is managed by the track/height)
	current_pos.y = lerp(current_pos.y, target_position.y, lerp_speed * delta)
	global_position = current_pos
	
	# Animate stickman procedurally
	if running:
		var t = Time.get_ticks_msec() * 0.001 * 15.0 + time_offset
		# Body bobbing
		visuals.position.y = 0.65 + abs(sin(t)) * 0.15
		# Leg swinging
		if leg_l and leg_r:
			leg_l.rotation.x = sin(t) * 0.6
			leg_r.rotation.x = -sin(t) * 0.6
		# Leaning forward
		visuals.rotation.x = 0.2 + sin(t) * 0.05
	else:
		# Idle animation
		var t = Time.get_ticks_msec() * 0.001 * 2.0 + time_offset
		visuals.position.y = 0.65 + sin(t) * 0.02
		if leg_l and leg_r:
			leg_l.rotation.x = 0.0
			leg_r.rotation.x = 0.0
		visuals.rotation.x = 0.0

func die() -> void:
	spawn_death_particles()
	queue_free()

func spawn_death_particles() -> void:
	# Create a temporary container for particles
	var container = Node3D.new()
	get_parent().add_child(container)
	container.global_position = global_position + Vector3(0, 0.5, 0)
	
	var active_color = Color(1.0, 0.2, 0.2) if is_enemy else Color(0.0, 0.7, 1.0)
	
	# Spawn 6 tiny colored boxes flying out
	for i in range(6):
		var p_mesh = MeshInstance3D.new()
		var box = BoxMesh.new()
		box.size = Vector3(0.15, 0.15, 0.15)
		p_mesh.mesh = box
		
		var mat = StandardMaterial3D.new()
		mat.albedo_color = active_color
		mat.emission_enabled = true
		mat.emission = active_color
		mat.emission_energy_multiplier = 0.5
		p_mesh.set_surface_override_material(0, mat)
		
		container.add_child(p_mesh)
		
		# Set random velocity
		var dir = Vector3(
			randf_range(-1.0, 1.0),
			randf_range(1.0, 3.0),
			randf_range(-1.0, 1.0)
		).normalized()
		var speed = randf_range(3.0, 6.0)
		
		animate_particle(p_mesh, dir * speed, container)
		
	# Self destruct the container after 0.6s
	var timer = get_tree().create_timer(0.6)
	timer.timeout.connect(container.queue_free)

func animate_particle(mesh: MeshInstance3D, velocity: Vector3, container: Node3D) -> void:
	var gravity = Vector3(0, -9.8, 0)
	var pos = mesh.position
	var rot = Vector3(randf() * 360, randf() * 360, randf() * 360)
	var rot_vel = Vector3(randf_range(-5, 5), randf_range(-5, 5), randf_range(-5, 5))
	
	var tween = mesh.create_tween().set_parallel(true)
	# Gravity & velocity simulation using custom interpolator
	var anim_lambda = func(t: float):
		if is_instance_valid(mesh):
			mesh.position = pos + velocity * t + 0.5 * gravity * t * t
			mesh.rotation = rot + rot_vel * t
			# Fade out scale
			mesh.scale = Vector3.ONE * (1.0 - t)
	tween.tween_method(anim_lambda, 0.0, 0.6, 0.6)

func _on_area_entered(other: Area3D) -> void:
	# Clash logic when player stickman meets enemy stickman
	if not is_enemy and other.has_method("die") and other.get("is_enemy") == true:
		# Prevent double collision triggering
		# We check if both are in tree to prevent crash
		if is_inside_tree() and other.is_inside_tree():
			other.die()
			self.die()
