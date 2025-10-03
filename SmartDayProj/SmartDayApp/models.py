from django.db import models

class homepage(models.Model):
    titulo = models.CharField(max_length=50)
    descricao = models.TextField(max_length=1000)
    logo = models.ImageField(upload_to='homepage/')

    def __str__(self):
        return self.titulo