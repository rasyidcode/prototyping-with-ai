extends Area3D

signal defeated

@export var base_health: int = 40
@export var health_per_level: int = 15

@onready var label: Label3D = $Label3D
@onready var visuals: Node3D = $Visuals

var health: int = 40
var max_health: int = 40
var active: bool = true
var is_dead: bool = false

func _ready() -> void:
	# Calculate health based on level progress
	max_health = base_health + (GlobalState.current_level - 1) * health_per_level
	health = max_health
	
	update_ui()
	area_entered.connect(_on_area_entered)
	
	# Apply giant theme styling
	apply_boss_theme()

func apply_boss_theme() -> void:
	# Golden/Purple/Red premium royal boss colors
	var boss_mat = StandardMaterial3D.new()
	boss_mat.albedo_color = Color(0.7, 0.1, 0.8) # Deep Royal Purple
	boss_mat.roughness = 0.2
	boss_mat.metallic = 0.5
	
	var crown_mat = StandardMaterial3D.new()
	crown_mat.albedo_color = Color(1.0, 0.85, 0.0) # Shiny Gold
	crown_mat.roughness = 0.1
	crown_mat.metallic = 0.9
	crown_mat.emission_enabled = true
	crown_mat.emission = Color(0.3, 0.25, 0.0)
	
	var eye_mat = StandardMaterial3D.new()
	eye_mat.albedo_color = Color(1.0, 0.0, 0.0) # Evil Glowing Red Eyes
	eye_mat.emission_enabled = true
	eye_mat.emission = Color(1.0, 0.0, 0.0)
	eye_mat.emission_energy_multiplier = 2.0
	
	# Apply materials to meshes
	var body = visuals.get_node_or_null("Body")
	var head = visuals.get_node_or_null("Head")
	var leg_l = visuals.get_node_or_null("LegLeft/Mesh")
	var leg_r = visuals.get_node_or_null("LegRight/Mesh")
	
	if body: body.set_surface_override_material(0, boss_mat)
	if head: head.set_surface_override_material(0, boss_mat)
	if leg_l: leg_l.set_surface_override_material(0, boss_mat)
	if leg_r: leg_r.set_surface_override_material(0, boss_mat)
	
	var eye_l = visuals.get_node_or_null("EyeLeft")
	var eye_r = visuals.get_node_or_null("EyeRight")
	if eye_l: eye_l.set_surface_override_material(0, eye_mat)
	if eye_r: eye_r.set_surface_override_material(0, eye_mat)
	
	# Apply crown material to spikes
	var crown = visuals.get_node_or_null("Crown")
	if crown:
		for child in crown.get_children():
			if child is MeshInstance3D:
				child.set_surface_override_material(0, crown_mat)

func update_ui() -> void:
	if label:
		label.text = "KING STICKMAN\nHP: " + str(health) + "/" + str(max_health)
		if health <= 0:
			label.text = "DEFEATED!"

func take_damage(amount: int) -> void:
	if is_dead:
		return
		
	health = max(0, health - amount)
	update_ui()
	
	# Play satisfying impact shake tween
	shake_visuals()
	
	if health <= 0:
		die()

func shake_visuals() -> void:
	var tween = create_tween()
	var original_pos = visuals.position
	# Shake side to side rapidly
	for i in range(4):
		var offset = Vector3(randf_range(-0.15, 0.15), randf_range(0.0, 0.1), randf_range(-0.15, 0.15))
		tween.tween_property(visuals, "position", original_pos + offset, 0.04)
	tween.tween_property(visuals, "position", original_pos, 0.04)

func die() -> void:
	is_dead = true
	active = false
	collision_layer = 0
	collision_mask = 0
	
	# Explode visuals with a huge flash!
	spawn_victory_particles()
	
	# Scale down and sink into floor
	var tween = create_tween().set_parallel(true)
	tween.tween_property(visuals, "scale", Vector3.ZERO, 0.8).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)
	tween.tween_property(visuals, "position:y", -2.0, 0.8)
	
	# Wait and emit defeated signal
	var timer = get_tree().create_timer(1.0)
	timer.timeout.connect(func():
		defeated.emit()
		queue_free()
	)

func spawn_victory_particles() -> void:
	var container = Node3D.new()
	get_parent().add_child(container)
	container.global_position = global_position + Vector3(0, 1.5, 0)
	
	# Spawn a huge fireworks explosion of golden cubes
	for i in range(35):
		var p_mesh = MeshInstance3D.new()
		var box = BoxMesh.new()
		box.size = Vector3(0.25, 0.25, 0.25)
		p_mesh.mesh = box
		
		var mat = StandardMaterial3D.new()
		# Gold/Yellow/Orange gradient
		var colors = [Color(1.0, 0.8, 0.0), Color(1.0, 0.5, 0.0), Color(1.0, 0.9, 0.2)]
		var c = colors[randi() % colors.size()]
		mat.albedo_color = c
		mat.emission_enabled = true
		mat.emission = c
		mat.emission_energy_multiplier = 2.0
		p_mesh.set_surface_override_material(0, mat)
		
		container.add_child(p_mesh)
		
		var dir = Vector3(
			randf_range(-1.0, 1.0),
			randf_range(-0.2, 1.5),
			randf_range(-1.0, 1.0)
		).normalized()
		var speed = randf_range(6.0, 12.0)
		
		# Custom gravity fall simulation
		var gravity = Vector3(0, -12.0, 0)
		var start_pos = p_mesh.position
		var tween = p_mesh.create_tween().set_parallel(true)
		var rot_vel = Vector3(randf_range(-6, 6), randf_range(-6, 6), randf_range(-6, 6))
		
		var anim_lambda = func(t: float):
			if is_instance_valid(p_mesh):
				p_mesh.position = start_pos + dir * speed * t + 0.5 * gravity * t * t
				p_mesh.rotation = rot_vel * t
				p_mesh.scale = Vector3.ONE * (1.0 - t)
		tween.tween_method(anim_lambda, 0.0, 1.0, 1.0)
		
	var timer = get_tree().create_timer(1.0)
	timer.timeout.connect(container.queue_free)

func _on_area_entered(area: Area3D) -> void:
	if is_dead:
		return
		
	# Check if overlapping object is a player stickman
	# Check if its parent is player (meaning it is player's stickman)
	var node = area
	var is_player_stickman = false
	while node != null:
		if node.is_in_group("player"):
			is_player_stickman = true
			break
		node = node.get_parent()
		
	if is_player_stickman and area.has_method("die") and area.get("is_enemy") == false:
		# Deal 1 damage to boss and kill the stickman
		take_damage(1)
		area.die()
