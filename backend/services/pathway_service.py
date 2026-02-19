def create_persistent_pathway(db: Session, user_id: uuid.UUID, role_id: uuid.UUID, skill_gaps: list):
    
    new_pathway = SavedPathway(user_id=user_id, target_role_id=role_id)
    db.add(new_pathway)
    db.flush() 

    for index, skill in enumerate(skill_gaps):
        step = PathwayStep(
            pathway_id=new_pathway.pathway_id,
            skill_id=skill.id,
            sequence_order=index,
            status=ProgressStatus.AVAILABLE if index == 0 else ProgressStatus.LOCKED
        )
        db.add(step)
    
    db.commit()
    return new_pathway.pathway_id