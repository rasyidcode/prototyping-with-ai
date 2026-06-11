extends Node3D

signal boss_defeated_event

@onready var flag: MeshInstance3D = $Flagpole/Flag
@onready var king_boss: Area3D = $KingBoss
@onready var boss_trigger: Area3D = $BossTrigger

var flag_raised: bool = false

func _ready() -> void:
	# Add boss trigger to group so player detects it
	boss_trigger.add_to_group("boss_trigger")
	
	# Connect to boss defeat
	if king_boss:
		king_boss.defeated.connect(_on_boss_defeated)
		
	# Initial flag state
	if flag:
		flag.position.y = 2.0
		# Grey material initially
		var mat = StandardMaterial3D.new()
		mat.albedo_color = Color(0.4, 0.4, 0.4)
		flag.set_surface_override_material(0, mat)
		
	# Apply castle styling
	apply_castle_theme()

func apply_castle_theme() -> void:
	# Castle stone, tower roofs, and decorative trim materials
	var stone_mat = StandardMaterial3D.new()
	stone_mat.albedo_color = Color(0.25, 0.25, 0.28) # Slate/Dark Grey
	stone_mat.roughness = 0.8
	stone_mat.metallic = 0.1
	
	var roof_mat = StandardMaterial3D.new()
	roof_mat.albedo_color = Color(0.8, 0.15, 0.2) # Deep Red Roofs
	roof_mat.roughness = 0.5
	
	var pole_mat = StandardMaterial3D.new()
	pole_mat.albedo_color = Color(0.7, 0.7, 0.7) # Shiny metal flagpole
	pole_mat.metallic = 0.9
	pole_mat.roughness = 0.2
	
	# Style all CSG shapes recursively
	_style_csg_recursive(self, stone_mat, roof_mat)
					
	var flagpole = get_node_or_null("Flagpole")
	if flagpole:
		var pole_mesh = flagpole.get_node_or_null("Pole")
		if pole_mesh:
			pole_mesh.set_surface_override_material(0, pole_mat)

func _style_csg_recursive(node: Node, stone_mat: Material, roof_mat: Material) -> void:
	if node is CSGBox3D or node is CSGCylinder3D:
		if node is CSGCylinder3D and node.cone:
			node.material = roof_mat
		else:
			node.material = stone_mat
			
	for child in node.get_children():
		_style_csg_recursive(child, stone_mat, roof_mat)

func _on_boss_defeated() -> void:
	if flag_raised:
		return
	flag_raised = true
	
	# Raise the flag and paint it blue (player team color!)
	if flag:
		var blue_mat = StandardMaterial3D.new()
		blue_mat.albedo_color = Color(0.0, 0.6, 1.0)
		blue_mat.emission_enabled = true
		blue_mat.emission = Color(0.0, 0.2, 0.4)
		flag.set_surface_override_material(0, blue_mat)
		
		var tween = create_tween()
		tween.tween_property(flag, "position:y", 5.2, 1.2).set_trans(Tween.TRANS_ELASTIC).set_ease(Tween.EASE_OUT)
		
	# Notify game controller
	boss_defeated_event.emit()
