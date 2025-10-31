from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import Group
from .models import *

@receiver(post_save, sender=Casa)
def criar_grupo_para_casa(sender, instance, created, **kwargs):
    if created:
        grupo, _ = Group.objects.get_or_create(name=instance.nome)
        instance.dono.groups.add(grupo)

        CasaMembro.objects.get_or_create(
            casa=instance,
            usuario=instance.dono,
            defaults={'papel': 'Responsavel'}
        )
