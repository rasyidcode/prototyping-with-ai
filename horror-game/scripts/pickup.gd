extends Interactable

enum Type { KEY, BATTERY, NOTE }
@export var type: Type = Type.KEY

@export_group("Key Settings")
@export var key_id: String = "bedroom_key"

@export_group("Battery Settings")
@export var battery_amount: float = 40.0

@export_group("Note Settings")
@export_multiline var note_text: String = "A scrawled note..."

func _ready() -> void:
	match type:
		Type.KEY:
			prompt_message = "[E] Take Key"
		Type.BATTERY:
			prompt_message = "[E] Take Flashlight Battery"
		Type.NOTE:
			prompt_message = "[E] Read Note"

	# Toggle visual representations
	if has_node("Visuals"):
		$Visuals/KeyVisual.visible = (type == Type.KEY)
		$Visuals/BatteryVisual.visible = (type == Type.BATTERY)
		$Visuals/NoteVisual.visible = (type == Type.NOTE)

func interact(player: CharacterBody3D) -> void:
	match type:
		Type.KEY:
			player.collect_key(key_id)
			queue_free()
		Type.BATTERY:
			player.add_battery(battery_amount)
			# Play key_sfx to signify pickup
			player.sfx_player.stream = player.key_sfx
			player.sfx_player.pitch_scale = 1.3 # higher pitch for battery
			player.sfx_player.volume_db = -6.0
			player.sfx_player.play()
			queue_free()
		Type.NOTE:
			player.hud.show_note(note_text)
