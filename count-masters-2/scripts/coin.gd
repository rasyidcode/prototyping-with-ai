extends Area3D

@export var rotation_speed: float = 3.0

func _ready() -> void:
	add_to_group("coin")
	
	# Apply shiny golden material
	var coin_mat = StandardMaterial3D.new()
	coin_mat.albedo_color = Color(1.0, 0.85, 0.0) # Gold
	coin_mat.roughness = 0.1
	coin_mat.metallic = 1.0
	coin_mat.emission_enabled = true
	coin_mat.emission = Color(0.2, 0.18, 0.0)
	
	var mesh = $Mesh
	if mesh:
		mesh.set_surface_override_material(0, coin_mat)

func _physics_process(delta: float) -> void:
	rotate_y(rotation_speed * delta)
