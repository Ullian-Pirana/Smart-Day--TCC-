from django.shortcuts import render

def home(request):
    return render(request, 'home.html')  # Substitua com o nome do seu template
