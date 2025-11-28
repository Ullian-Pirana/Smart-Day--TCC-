from django.shortcuts import render, redirect, get_object_or_404, get_object_or_404
from django.contrib.auth.models import User, Group
from django.contrib.auth.decorators import login_required
from django.contrib.auth import logout, authenticate, login
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_http_methods
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils.dateparse import parse_date
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.utils.timezone import now
from django.db.utils import IntegrityError
from django.db import IntegrityError, transaction
from datetime import datetime, date
from .models import *
from .forms import *
import json, calendar, uuid

#Funções a nivel de projeto

def get_casa_ativa(request):
    casa_id = request.session.get('casa_ativa_id')
    if not casa_id:
        return None
    return Casa.objects.filter(id=casa_id).first()

def is_responsavel_na_casa(user, casa):
    membro = CasaMembro.objects.filter(usuario=user, casa=casa).first()
    return membro and membro.papel == "Responsavel"

def is_responsavel(user):
    grupos = user.groups.values_list('name', flat=True)
    for nome in grupos:
        nome_normalizado = nome.lower().replace("í", "i").replace("é", "e").replace("ê", "e")
        if nome_normalizado in ("responsavel", "responsaveis"):
            return True
    return False

def Homepage(request):
    context = {'dados_home': homepage.objects.all()}
    return render(request, 'homepage.html', context)

#   Funções relacionadas a acesso do usuario

def Login(request):
    if request.method == 'POST':
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(request, username=username, password=password)
        if user is not None:
            login(request, user)
            messages.success(request, f"Login realizado com sucesso! Bem-vindo, {user.username}. ✅")
            return redirect('homepage')
        else:
            messages.error(request, "Usuário ou senha inválida. ❌")
            return render(request, 'Login.html')
    return render(request, 'Login.html')

def Registro(request):
    if request.method == "POST":
        form = RegistroForm(request.POST)
        if form.is_valid():
            try:
                user = User.objects.create_user(
                    username=form.cleaned_data['username'],
                    email=form.cleaned_data['email'],
                    password=form.cleaned_data['password']
                )
                messages.success(request, "Conta criada com sucesso! Faça login para continuar.")
                return redirect('login')
            except IntegrityError:
                messages.error(request, "Este usuário já existe.")
        else:
            messages.error(request, "Corrija os erros no formulário.")
    else:
        form = RegistroForm()

    return render(request, "registro.html", {"form": form})

@login_required
def Sair(request):
    logout(request)
    messages.success(request, "Logout realizado com sucesso! 👋")
    return redirect('homepage')

#funções relacionadas a pagina To-Do
@login_required
def todo_page(request):
    casa_id = request.session.get('casa_ativa_id')
    casa = get_casa_ativa(request)
    if not casa:
        messages.error(request, "Selecione uma casa primeiro.")
        return redirect('minha_casa')
    if casa_id:
        from SmartDayApp.models import Casa
        casa_ativa = Casa.objects.filter(id=casa_id).first()

    return render(request, 'todo.html', {'casa_ativa': casa_ativa})

@login_required
def listar_tarefas(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

    data = request.GET.get('data')
    if not data:
        return JsonResponse({'erro': 'Data não informada'}, status=400)

    data_obj = parse_date(data)

    tarefas = Tarefa.objects.filter(
        casa=casa,
        data_inicio__lte=data_obj,
        data_fim__gte=data_obj
    ).order_by('concluida', 'data_fim')

    tarefas_json = [
        {
            'id': t.id,
            'titulo': t.titulo,
            'descricao': t.descricao,
            'concluida': t.concluida,
            'data_inicio': t.data_inicio.strftime('%Y-%m-%d'),
            'data_fim': t.data_fim.strftime('%Y-%m-%d'),
            'criado_por': t.criado_por.username,
        }
        for t in tarefas
    ]

    usuario = request.user.username
    is_responsavel_user = is_responsavel_na_casa(request.user, casa)

    return JsonResponse({
        'tarefas': tarefas_json,
        'usuario': usuario,
        'is_responsavel': is_responsavel_user,
        'casa_nome': casa.nome,
    })

@login_required
@require_POST
def criar_tarefa(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

    data = json.loads(request.body)

    try:
        data_inicio = parse_date(data.get('data_inicio'))
        data_fim = parse_date(data.get('data_fim'))

        if data_inicio and data_fim and data_fim < data_inicio:
            return JsonResponse({'erro': 'A data de término não pode ser anterior à data de início.'}, status=400)

        tarefa = Tarefa.objects.create(
            titulo=data.get('titulo'),
            descricao=data.get('descricao', ''),
            data_inicio=data_inicio,
            data_fim=data_fim,
            criado_por=request.user,
            casa=casa
        )

        return JsonResponse({'mensagem': 'Tarefa criada com sucesso!'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)

@login_required
@require_POST
def excluir_tarefa(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        if not (is_responsavel_na_casa(request.user, casa) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Sem permissão para excluir."}, status=403)

        tarefa.delete()
        return JsonResponse({"mensagem": "Tarefa excluída com sucesso!"})
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

@login_required
@require_POST
def editar_tarefa(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        if not (is_responsavel_na_casa(request.user, casa) or tarefa.criado_por == request.user):
            return JsonResponse({"erro": "Sem permissão para editar."}, status=403)

        data = json.loads(request.body)
        data_inicio = parse_date(data.get("data_inicio")) or tarefa.data_inicio
        data_fim = parse_date(data.get("data_fim")) or tarefa.data_fim

        if data_fim < data_inicio:
            return JsonResponse({"erro": "Data final não pode ser anterior à inicial."}, status=400)

        tarefa.titulo = data.get("titulo", tarefa.titulo)
        tarefa.descricao = data.get("descricao", tarefa.descricao)
        tarefa.data_inicio = data_inicio
        tarefa.data_fim = data_fim
        tarefa.save()

        return JsonResponse({"mensagem": "Tarefa atualizada com sucesso!"})
    except Exception as e:
        return JsonResponse({"erro": str(e)}, status=400)

@login_required
@require_POST
def atualizar_status(request, id):
    try:
        tarefa = get_object_or_404(Tarefa, id=id)
        casa = tarefa.casa

        membro_casa = CasaMembro.objects.filter(casa=casa, usuario=request.user).exists() or casa.dono == request.user
        if not membro_casa:
            return JsonResponse({"erro": "Sem permissão para alterar status."}, status=403)

        tarefa.concluida = not tarefa.concluida
        tarefa.save()

        return JsonResponse({'status': tarefa.concluida})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=400)

#Realiza a troca do tema do site
def toggle_theme(request):
    request.session['dark_mode'] = not request.session.get('dark_mode', False)
    return HttpResponse('OK')

#views relacionadas a criação das casas
@login_required
def minha_casa_page(request):
    casas = Casa.objects.filter(models.Q(dono=request.user) | models.Q(membros_relacionados__usuario=request.user)).distinct()

    casa_ativa = None
    membros_relacionados = []
    usuarios_disponiveis = []

    casa_id = request.session.get('casa_ativa_id')
    if casa_id:
        casa_ativa = Casa.objects.filter(id=casa_id).first()
        if casa_ativa:
            membros_relacionados = CasaMembro.objects.filter(casa=casa_ativa).select_related('usuario')
            usuarios_em_casa = [cm.usuario.id for cm in membros_relacionados]
            usuarios_disponiveis = User.objects.exclude(id__in=usuarios_em_casa)

    return render(request, 'minha_casa.html', {
        'casas': casas,
        'casa_ativa': casa_ativa,
        'membros_relacionados': membros_relacionados,
        'usuarios_disponiveis': usuarios_disponiveis,
    })

@login_required
def criar_casa(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            nome = data.get('nome')
            if not nome:
                return JsonResponse({'erro': 'Nome é obrigatório.'}, status=400)

            casa = Casa.objects.create(nome=nome, dono=request.user)
            Group.objects.get_or_create(name=nome)

            return JsonResponse({'mensagem': f'Casa "{casa.nome}" criada com sucesso!'})
        except Exception as e:
            return JsonResponse({'erro': str(e)}, status=400)
    else:
        return JsonResponse({'erro': 'Método não permitido.'}, status=405)

@login_required
def gerenciar_casa(request, id):
    casa = get_object_or_404(Casa, id=id)

    if not CasaMembro.objects.filter(casa=casa, usuario=request.user).exists() and casa.dono != request.user:
        messages.error(request, "Você não faz parte desta casa.")
        return redirect('minha_casa')

    request.session['casa_ativa_id'] = casa.id
    return redirect('minha_casa')

@login_required
@require_POST
def adicionar_usuario_casa(request, id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    try:
        data = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'erro': 'JSON inválido.'}, status=400)

    username = (data.get('username') or '').strip()
    if not username:
        return JsonResponse({'erro': 'Informe o nome de usuário.'}, status=400)

    try:
        usuario = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({'erro': 'Usuário não encontrado.'}, status=404)

    if CasaMembro.objects.filter(casa=casa, usuario=usuario).exists() or casa.dono == usuario:
        return JsonResponse({'erro': 'Este usuário já faz parte da casa.'}, status=400)

    ConviteCasa.objects.filter(casa=casa, usuario=usuario).delete()

    convite = ConviteCasa.objects.create(
        casa=casa,
        usuario=usuario,
        criado_por=request.user
    )

    return JsonResponse({
        'mensagem': f'Convite enviado para {usuario.username}.',
        'convite_id': convite.id
    })

@login_required
def meus_convites(request):
    convites = ConviteCasa.objects.filter(usuario=request.user).order_by('-criado_em')
    return render(request, 'meus_convites.html', {'convites': convites})

@login_required
@require_POST
def aceitar_convite(request, convite_id):
    convite = get_object_or_404(ConviteCasa, id=convite_id, usuario=request.user)
    if convite.status != 'pending':
        return JsonResponse({'erro': 'Convite já não está pendente.'}, status=400)

    with transaction.atomic():
        CasaMembro.objects.get_or_create(casa=convite.casa, usuario=request.user, defaults={'papel': 'Usuarios'})
        convite.atualizado_em = timezone.now()
        convite.delete()

    return JsonResponse({'mensagem': f'Você aceitou o convite para a casa {convite.casa.nome}.'})

@login_required
@require_POST
def recusar_convite(request, convite_id):
    convite = get_object_or_404(ConviteCasa, id=convite_id, usuario=request.user)
    if convite.status != 'pending':
        return JsonResponse({'erro': 'Convite já não está pendente.'}, status=400)

    convite.status = 'declined'
    convite.atualizado_em = timezone.now()
    convite.save()
    return JsonResponse({'mensagem': f'Você recusou o convite para a casa {convite.casa.nome}.'})

@login_required
@require_POST
def remover_usuario_casa(request, id, user_id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    CasaMembro.objects.filter(casa=casa, usuario_id=user_id).delete()
    return JsonResponse({'mensagem': 'Usuário removido com sucesso.'})

@login_required
@require_POST
def editar_casa(request, id):
    try:
        casa = get_object_or_404(Casa, id=id)
        if casa.dono != request.user:
            return JsonResponse({'erro': 'Apenas o dono pode editar a casa.'}, status=403)

        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'erro': 'JSON inválido.'}, status=400)

        novo_nome = (data.get('nome') or '').strip()
        if not novo_nome:
            return JsonResponse({'erro': 'Nome inválido.'}, status=400)

        if Casa.objects.exclude(id=casa.id).filter(nome__iexact=novo_nome).exists():
            return JsonResponse({'erro': 'Já existe outra casa com esse nome.'}, status=400)

        casa.nome = novo_nome
        casa.save()

        return JsonResponse({'mensagem': 'Casa atualizada com sucesso.', 'novo_nome': casa.nome})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

@login_required
@require_POST
def excluir_casa(request, id):
    try:
        casa = get_object_or_404(Casa, id=id)
        if casa.dono != request.user:
            return JsonResponse({'erro': 'Apenas o dono pode excluir a casa.'}, status=403)

        casa.delete()

        if request.session.get('casa_ativa_id') == id:
            try:
                del request.session['casa_ativa_id']
            except KeyError:
                pass

        return JsonResponse({'mensagem': 'Casa excluída com sucesso.'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

@login_required
@require_POST
def definir_papel(request, id):
    casa = get_object_or_404(Casa, id=id)
    if casa.dono != request.user:
        return JsonResponse({'erro': 'Sem permissão.'}, status=403)

    data = json.loads(request.body)
    usuario_id = data.get('usuario_id')
    papel = data.get('papel')

    if papel not in ['Usuarios', 'Responsavel']:
        return JsonResponse({'erro': 'Papel inválido.'}, status=400)

    membro = get_object_or_404(CasaMembro, casa=casa, usuario_id=usuario_id)
    membro.papel = papel
    membro.save()

    return JsonResponse({'mensagem': f'Permissão atualizada: {membro.usuario.username} agora é {papel}.'})

#Funções referentes a pagina de "Lista de Compras"
@login_required
def lista_compras(request):
    casa_id = request.session.get('casa_ativa_id')  # 🔹 padronizado

    if not casa_id:
        messages.error(request, "Você precisa selecionar uma casa antes de acessar a lista de compras.")
        return redirect('minha_casa')

    casa = get_object_or_404(Casa, id=casa_id)

    is_responsavel = CasaMembro.objects.filter(
        casa=casa, usuario=request.user, papel='Responsavel'
    ).exists() or request.user == casa.dono

    aguardando = ItemCompra.objects.filter(casa=casa, aprovado=False)
    aprovados = ItemCompra.objects.filter(casa=casa, aprovado=True)

    return render(request, 'lista_compras.html', {
        'is_responsavel': is_responsavel,
        'aguardando': aguardando,
        'aprovados': aprovados,
    })

@login_required
def listar_itens_compras(request):
    casa_id = request.session.get('casa_ativa_id')
    if not casa_id:
        return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

    casa = get_object_or_404(Casa, id=casa_id)

    is_responsavel = CasaMembro.objects.filter(
        casa=casa, usuario=request.user, papel='Responsavel'
    ).exists() or request.user == casa.dono

    aguardando_qs = ItemCompra.objects.filter(casa=casa, aprovado=False).order_by('-data_criacao')
    aprovados_qs = ItemCompra.objects.filter(casa=casa, aprovado=True).order_by('-data_criacao')

    def serialize(item):
        return {
            'id': item.id,
            'nome': item.nome,
            'valor_unitario': str(item.valor_unitario) if item.valor_unitario is not None else None,
            'quantidade': item.quantidade,
            'aprovado': item.aprovado,
            'comprado': item.comprado,
            'criado_por': item.criado_por.username,
            'data_criacao': item.data_criacao.isoformat(),
        }

    aguardando = [serialize(i) for i in aguardando_qs]
    aprovados = [serialize(i) for i in aprovados_qs]

    return JsonResponse({
        'aguardando': aguardando,
        'aprovados': aprovados,
        'is_responsavel': is_responsavel,
        'casa_nome': casa.nome,
    })

@require_POST
@login_required
def criar_item(request):
    try:
        data = json.loads(request.body)
        nome = data.get("nome")
        valor = data.get("valor_unitario")
        quantidade = data.get("quantidade", 1)

        casa_id = request.session.get('casa_ativa_id')  # 🔹 padronizado
        if not casa_id:
            return JsonResponse({'erro': 'Nenhuma casa ativa selecionada.'}, status=400)

        casa = get_object_or_404(Casa, id=casa_id)

        is_responsavel = CasaMembro.objects.filter(
            casa=casa, usuario=request.user, papel='Responsavel'
        ).exists() or request.user == casa.dono

        item = ItemCompra.objects.create(
            casa=casa,
            criado_por=request.user,
            nome=nome,
            valor_unitario=valor if valor else None,
            quantidade=quantidade or 1,
            aprovado=is_responsavel  # vai direto pra lista se for responsável
        )

        return JsonResponse({
            'status': 'ok',
            'item': item.nome,
            'aprovado': item.aprovado
        })

    except json.JSONDecodeError:
        return JsonResponse({'erro': 'JSON inválido.'}, status=400)
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)

@login_required
@require_POST
def aprovar_item(request, id):
    item = get_object_or_404(ItemCompra, id=id)
    item.aprovado = True
    item.save()
    return JsonResponse({'status': 'aprovado'})


@login_required
@require_POST
def recusar_item(request, id):
    item = get_object_or_404(ItemCompra, id=id)
    item.delete()
    return JsonResponse({'status': 'recusado'})


@login_required
@require_POST
def alternar_status_compra(request, id):
    item = get_object_or_404(ItemCompra, id=id)
    item.comprado = not item.comprado
    item.save()
    return JsonResponse({'status': item.comprado})

@login_required
@require_POST
def editar_item(request, id):
    try:
        item = get_object_or_404(ItemCompra, id=id)
        casa = item.casa
        # só responsavel ou dono pode editar (ou quem criou? sua regra)
        if not (CasaMembro.objects.filter(casa=casa, usuario=request.user, papel='Responsavel').exists() or request.user == casa.dono):
            return JsonResponse({'erro': 'Sem permissão.'}, status=403)

        data = json.loads(request.body)
        item.nome = data.get('nome', item.nome)
        valor = data.get('valor_unitario', None)
        item.valor_unitario = valor if valor is not None and valor != '' else None
        item.quantidade = int(data.get('quantidade', item.quantidade))
        item.save()
        return JsonResponse({'status': 'ok'})
    except Exception as e:
        return JsonResponse({'erro': str(e)}, status=500)
    
@login_required
@require_POST
def excluir_item(request, id):
    item = get_object_or_404(ItemCompra, id=id)
    casa = item.casa

    # Apenas o dono da casa, responsáveis ou o criador do item podem excluir
    pode_excluir = (
        request.user == casa.dono or
        CasaMembro.objects.filter(casa=casa, usuario=request.user, papel='Responsavel').exists() or
        item.criado_por == request.user
    )

    if not pode_excluir:
        return JsonResponse({'erro': 'Você não tem permissão para excluir este item.'}, status=403)

    item.delete()
    return JsonResponse({'mensagem': 'Item excluído com sucesso!'})

# Funcionalidades para paginas de Finanças

@login_required
def financas_page(request):
    casa = get_casa_ativa(request)
    if not casa:
        messages.error(request, "Selecione uma casa primeiro.")
        return redirect('minha_casa')

    # permissões
    is_resp = is_responsavel_na_casa(request.user, casa)

    # cálculos financeiros
    entradas_qs = Gasto.objects.filter(casa=casa, categoria="renda")
    saidas_qs = Gasto.objects.filter(casa=casa, categoria="gasto")

    total_renda = sum(g.valor for g in entradas_qs)
    total_gastos = sum(g.valor for g in saidas_qs)
    saldo = total_renda - total_gastos

    return render(request, "financas.html", {
        "saldo": saldo,
        "total_renda": total_renda,
        "total_gastos": total_gastos,
        "is_responsavel": is_resp,
    })

@require_POST
@login_required
def salvar_transacao(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({"erro": "Nenhuma casa ativa selecionada."}, status=400)

    # apenas responsáveis
    if not is_responsavel_na_casa(request.user, casa):
        return JsonResponse({"erro": "Apenas responsáveis podem registrar transações."}, status=403)

    data = json.loads(request.body)

    Gasto.objects.create(
        casa=casa,
        usuario=request.user,
        valor=data["valor"],
        data=data["data"],
        local=data.get("local", ""),
        nota=data.get("nota", ""),
        categoria=data["categoria"],
    )

    return JsonResponse({"mensagem": "Transação registrada!"})

@login_required
def excluir_transacao(request, id):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({"erro": "Nenhuma casa ativa selecionada."}, status=400)

    if not is_responsavel_na_casa(request.user, casa):
        return JsonResponse({"erro": "Sem permissão."}, status=403)

    transacao = Gasto.objects.filter(id=id, casa=casa).first()
    if not transacao:
        return JsonResponse({"erro": "Transação não encontrada."}, status=404)

    transacao.delete()
    return JsonResponse({"mensagem": "Transação removida!"})

@login_required
def editar_transacao(request, id):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({"erro": "Nenhuma casa ativa selecionada."}, status=400)

    if not is_responsavel_na_casa(request.user, casa):
        return JsonResponse({"erro": "Sem permissão."}, status=403)

    transacao = Gasto.objects.filter(id=id, casa=casa).first()
    if not transacao:
        return JsonResponse({"erro": "Transação não encontrada."}, status=404)

    data = json.loads(request.body)

    transacao.valor = data["valor"]
    transacao.data = data["data"]
    transacao.local = data.get("local", "")
    transacao.nota = data.get("nota", "")
    transacao.categoria = data["categoria"]
    transacao.save()

    return JsonResponse({"mensagem": "Transação atualizada!"})

@login_required
def listar_transacoes(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({"erro": "Nenhuma casa ativa selecionada."}, status=400)

    transacoes = Gasto.objects.filter(casa=casa).order_by("-data", "-id")

    lista = [
        {
            "id": t.id,
            "valor": float(t.valor),
            "data": str(t.data),
            "local": t.local,
            "nota": t.nota,
            "categoria": t.categoria,
        }
        for t in transacoes
    ]

    return JsonResponse(lista, safe=False)

@login_required
def grafico_mensal(request):
    casa = get_casa_ativa(request)
    if not casa:
        return JsonResponse({"erro": "Nenhuma casa ativa selecionada."}, status=400)

    today = date.today()
    dias_mes = calendar.monthrange(today.year, today.month)[1]

    labels = list(range(1, dias_mes + 1))
    entradas = [0] * dias_mes
    saidas = [0] * dias_mes

    transacoes = Gasto.objects.filter(
        casa=casa,
        data__year=today.year,
        data__month=today.month
    )

    for t in transacoes:
        dia_idx = t.data.day - 1
        if t.categoria == "renda":
            entradas[dia_idx] += float(t.valor)
        else:
            saidas[dia_idx] += float(t.valor)

    return JsonResponse({
        "labels": labels,
        "entradas": entradas,
        "saidas": saidas
    })

# Funções para a pagina de Perfil Do usuario

@login_required
def perfil_page(request):
    casa = get_casa_ativa(request)

    perfil = getattr(request.user, "perfil", None)
    if perfil is None:
        perfil, _ = UserProfile.objects.get_or_create(user=request.user)

    papel = None
    membros = []
    nome_casa = None
    if casa:
        if casa.dono == request.user:
            papel = "Dono"
        else:
            cm = CasaMembro.objects.filter(casa=casa, usuario=request.user).first()
            papel = cm.papel if cm else "Usuário"
        nome_casa = casa.nome
        membros_qs = CasaMembro.objects.filter(casa=casa).select_related('usuario').order_by('usuario__username')
        membros = [m.usuario.username for m in membros_qs]

    tarefas = Tarefa.objects.filter(criado_por=request.user, casa=casa).order_by('-criado_em') if casa else []
    compras = ItemCompra.objects.filter(criado_por=request.user, casa=casa).order_by('-data_criacao') if casa else []

    return render(request, "perfil.html", {
        "perfil": perfil,
        "usuario": request.user,
        "papel": papel,
        "nome_casa": nome_casa,
        "membros": membros,
        "tarefas_contribuicoes": tarefas,
        "compras_contribuicoes": compras,
    })


@login_required
@require_http_methods(["POST"])
def perfil_atualizar(request):
    perfil = getattr(request.user, "perfil", None)
    if perfil is None:
        perfil, _ = UserProfile.objects.get_or_create(user=request.user)

    # arquivo de imagem (opcional)
    foto = request.FILES.get("foto")
    contato = request.POST.get("contato", "").strip()
    sobre = request.POST.get("sobre", "").strip()

    if foto:
        perfil.foto.save(foto.name, foto, save=False)

    perfil.contato = contato
    perfil.sobre = sobre
    perfil.save()

    return JsonResponse({"mensagem": "Perfil atualizado!", "foto_url": perfil.foto.url if perfil.foto else None})

# Funções para a pagina de Configurações

@login_required
def configuracoes_page(request):
    casa = get_casa_ativa(request)
    perfil = getattr(request.user, "perfil", None)

    return render(request, "configuracoes.html", {
        "usuario": request.user,
        "dark_mode": request.session.get("dark_mode", False),
        "casa": casa,
        "perfil": perfil,
    })


@login_required
@require_POST
def alterar_senha(request):
    senha_atual = request.POST.get("senha_atual")
    nova_senha = request.POST.get("nova_senha")
    confirmar_senha = request.POST.get("confirmar_senha")

    if not request.user.check_password(senha_atual):
        return JsonResponse({"erro": "Senha atual incorreta."}, status=400)

    if nova_senha != confirmar_senha:
        return JsonResponse({"erro": "As senhas não coincidem."}, status=400)

    request.user.set_password(nova_senha)
    request.user.save()

    return JsonResponse({"mensagem": "Senha alterada com sucesso!"})

@login_required
def excluir_conta(request):
    if request.method != "POST":
        return JsonResponse({"erro": "Método inválido"}, status=405)

    user = request.user

    logout(request)
    user.delete()

    return JsonResponse({"mensagem": "Conta excluída com sucesso!"})
