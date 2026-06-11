extends Area3D

@onready var label: Label3D = $Label3D
@onready var background_mesh: MeshInstance3D = $Background
@onready var border_mesh: MeshInstance3D = $Border

# Gate types: "add", "subtract", "multiply", "divide"
var operation_type: String = "add"
var value: float = 5.0
var active: bool = true

# Materials
var positive_bg: StandardMaterial3D
var positive_border: StandardMaterial3D
var negative_bg: StandardMaterial3D
var negative_border: StandardMaterial3D
var inactive_mat: StandardMaterial3D

func _ready() -> void:
	setup_materials()
	# Apply gate settings based on config (can be overwritten by generator)
	update_visuals()
	area_entered.connect(_on_area_entered)

func setup_materials() -> void:
	# Positive: Neon Glowing Green
	positive_bg = StandardMaterial3D.new()
	positive_bg.albedo_color = Color(0.0, 0.9, 0.4, 0.45)
	positive_bg.transparency = StandardMaterial3D.TRANSPARENCY_ALPHA
	positive_bg.shading_mode = StandardMaterial3D.SHADING_MODE_UNSHADED
	positive_bg.cull_mode = StandardMaterial3D.CULL_DISABLED
	
	positive_border = StandardMaterial3D.new()
	positive_border.albedo_color = Color(0.0, 1.0, 0.5)
	positive_border.emission_enabled = true
	positive_border.emission = Color(0.0, 1.0, 0.5)
	positive_border.emission_energy_multiplier = 2.0
	
	# Negative: Neon Glowing Red
	negative_bg = StandardMaterial3D.new()
	negative_bg.albedo_color = Color(0.9, 0.1, 0.15, 0.45)
	negative_bg.transparency = StandardMaterial3D.TRANSPARENCY_ALPHA
	negative_bg.shading_mode = StandardMaterial3D.SHADING_MODE_UNSHADED
	negative_bg.cull_mode = StandardMaterial3D.CULL_DISABLED
	
	negative_border = StandardMaterial3D.new()
	negative_border.albedo_color = Color(1.0, 0.1, 0.2)
	negative_border.emission_enabled = true
	negative_border.emission = Color(1.0, 0.1, 0.2)
	negative_border.emission_energy_multiplier = 2.0
	
	# Inactive / Used: Dim translucent gray
	inactive_mat = StandardMaterial3D.new()
	inactive_mat.albedo_color = Color(0.3, 0.3, 0.3, 0.15)
	inactive_mat.transparency = StandardMaterial3D.TRANSPARENCY_ALPHA
	inactive_mat.shading_mode = StandardMaterial3D.SHADING_MODE_UNSHADED

func setup_gate(op: String, val: float) -> void:
	operation_type = op
	value = val
	
	# Apply gate bonus from upgrades to positive gates
	if operation_type == "add" or operation_type == "multiply":
		var bonus = GlobalState.get_upgrade_value("gate_bonus", GlobalState.upgrade_gate_bonus)
		if operation_type == "add":
			value += int(bonus)
		elif operation_type == "multiply":
			# Let's say +0.1 to multiplier per gate bonus level
			value += bonus * 0.1
			
	update_visuals()

func update_visuals() -> void:
	if not is_node_ready():
		await ready
		
	var is_positive = operation_type == "add" or operation_type == "multiply"
	
	# Apply background & border materials
	background_mesh.set_surface_override_material(0, positive_bg if is_positive else negative_bg)
	border_mesh.set_surface_override_material(0, positive_border if is_positive else negative_border)
	
	# Label text and color
	var op_symbol = ""
	match operation_type:
		"add": op_symbol = "+"
		"subtract": op_symbol = "-"
		"multiply": op_symbol = "x"
		"divide": op_symbol = "/"
		
	var display_val = String.num(value) if operation_type != "multiply" else String.num(value, 1)
	label.text = op_symbol + display_val
	label.modulate = Color(1.0, 1.0, 1.0)
	label.outline_modulate = Color(0.0, 0.0, 0.0)

func deactivate() -> void:
	active = false
	background_mesh.set_surface_override_material(0, inactive_mat)
	border_mesh.set_surface_override_material(0, inactive_mat)
	label.modulate = Color(0.4, 0.4, 0.4, 0.5)
	
	# Smoothly scale down text
	var tween = create_tween()
	tween.tween_property(label, "scale", Vector3.ZERO, 0.3).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_IN)

func _on_area_entered(area: Area3D) -> void:
	if not active:
		return
		
	# Check if overlap is by a player stickman or player leader area
	var is_player_element = false
	var player_node = null
	
	# Walk up hierarchy to find Player
	var current = area
	while current != null:
		if current.is_in_group("player"):
			is_player_element = true
			player_node = current
			break
		current = current.get_parent()
		
	if is_player_element and player_node != null:
		trigger_gate(player_node)

func trigger_gate(player: Node3D) -> void:
	# Disable the pair so the other gate can't be used
	var parent_pair = get_parent()
	if parent_pair and parent_pair.has_method("disable_pair"):
		parent_pair.disable_pair()
	else:
		deactivate()
		
	# Apply math operation
	match operation_type:
		"add":
			player.spawn_stickmen(int(value))
		"multiply":
			player.multiply_crowd(value)
		"subtract":
			player.remove_random_stickmen(int(value))
		"divide":
			# division by 2 is equivalent to multiplying by 0.5
			player.multiply_crowd(1.0 / value if value > 0 else 1.0)
			
	# Play nice satisfying audio chime/whoosh (handled in main controller or locally)
	spawn_gate_trigger_particles()

func spawn_gate_trigger_particles() -> void:
	var container = Node3D.new()
	get_parent().add_child(container)
	container.global_position = global_position
	
	var color = Color(0.0, 1.0, 0.5) if (operation_type == "add" or operation_type == "multiply") else Color(1.0, 0.1, 0.2)
	
	# Spawn a burst of tiny expanding rings or particles
	for i in range(12):
		var mesh_inst = MeshInstance3D.new()
		var s_mesh = SphereMesh.new()
		s_mesh.radius = 0.08
		mesh_inst.mesh = s_mesh
		
		var mat = StandardMaterial3D.new()
		mat.albedo_color = color
		mat.emission_enabled = true
		mat.emission = color
		mat.emission_energy_multiplier = 2.0
		mesh_inst.set_surface_override_material(0, mat)
		
		container.add_child(mesh_inst)
		
		# Animate in a flat disk shape expanding outwards (gate burst!)
		var angle = randf() * TAU
		var dist = randf_range(1.5, 3.5)
		var dir = Vector3(cos(angle), randf_range(-0.5, 0.5), sin(angle)).normalized()
		
		var tween = mesh_inst.create_tween().set_parallel(true)
		tween.tween_property(mesh_inst, "position", dir * dist, 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_OUT)
		tween.tween_property(mesh_inst, "scale", Vector3.ZERO, 0.5).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
		
	var timer = get_tree().create_timer(0.5)
	timer.timeout.connect(container.queue_free)
